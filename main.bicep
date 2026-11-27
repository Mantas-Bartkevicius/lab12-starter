// LAB12: ACR + AKS in ONE Bicep file (deploy to an existing resource group).
targetScope = 'resourceGroup'

@description('Unique lowercase student identifier, e.g. jonaspi26')
@minLength(4)
@maxLength(20)
param studentId string

@description('AKS Kubernetes version currently offered in this Azure region')
param kubernetesVersion string

@description('Small educational node pool. D2s_v4 must be verified for the subscription.')
param nodeVmSize string = 'Standard_D2s_v4'

param location string = resourceGroup().location

var aksName = 'aks-lab12-${studentId}'
var acrName = 'acrlab12${uniqueString(resourceGroup().id)}'

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    // No admin credentials. Images are copied from public GHCR with az acr import.
    // Legacy RBAC mode keeps the educational AKS --attach-acr command working.
    roleAssignmentMode: 'LegacyRegistryPermissions'
    adminUserEnabled: false
  }
}

resource cluster 'Microsoft.ContainerService/managedClusters@2024-09-01' = {
  name: aksName
  location: location
  sku: {
    name: 'Base'
    tier: 'Free'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    dnsPrefix: aksName
    kubernetesVersion: kubernetesVersion
    enableRBAC: true
    agentPoolProfiles: [
      {
        name: 'nodepool1'
        mode: 'System'
        count: 1
        vmSize: nodeVmSize
        osType: 'Linux'
        type: 'VirtualMachineScaleSets'
        osDiskSizeGB: 64
      }
    ]
    networkProfile: {
      networkPlugin: 'azure'
      networkPluginMode: 'overlay'
      loadBalancerSku: 'standard'
      outboundType: 'loadBalancer'
      podCidr: '10.244.0.0/16'
      serviceCidr: '10.0.0.0/16'
      dnsServiceIP: '10.0.0.10'
    }
  }
}

output aksName string = cluster.name
output acrName string = registry.name
output acrLoginServer string = registry.properties.loginServer
