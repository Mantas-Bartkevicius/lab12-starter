# LAB12 v0.5 - GitHub Actions -> GHCR -> ACR -> AKS -> Helm

**No local Docker Engine or Docker Desktop needed.** This starter is paired with
`LAB12_AKS_v05_be_vietinio_Docker.docx` (Lithuanian step-by-step lab).

## Architecture

1. The student edits `app.js` in a GitHub repository (or local VS Code).
2. **GitHub Actions** (`.github/workflows/build-image.yml`) checks `app.js`,
   builds the Docker image on a GitHub runner, and publishes `v1`/`v2` to GHCR.
3. Make the GHCR package **Public** to allow an anonymous import.
4. **Azure Cloud Shell** runs `az acr import --source ghcr.io/<owner>/lab12-web:v1`.
5. **AKS** pulls the private ACR copy using a managed identity, and runs the app.
6. `app.yaml` demonstrates Deployment, Service and HPA; Helm manages the same app.

## Files

- `.github/workflows/build-image.yml`: manually triggered V1/V2 Docker build on GitHub runners.
- `main.bicep`: one file creates ACR Basic + AKS (in an existing resource group).
- `app.js`: website + Pod metadata + limited CPU load endpoint, no npm dependencies.
- `Dockerfile`: container recipe executed by GitHub Actions, **not by the student PC**.
- `app.yaml`: one Kubernetes manifest (Deployment / Service / HPA).
- `helm/lab12-web/`: Helm chart for **the same** Deployment and Service.

## Quick start: cloud build

- Create a **public** GitHub repository under your account and upload contents of
  `lab12-starter/` to the **repository root**, including hidden `.github/workflows/`.
  (If lecturer provides a template GitHub repo, use "Use this template" instead.)
- Edit `IMAGE_MESSAGE` in `app.js` and commit the V1 text.
- On GitHub go to **Actions > LAB12 - Build and publish image > Run workflow > v1**.
- Confirm green build and publish logs.
- Open your GitHub profile > Packages > `lab12-web` > Package settings, set
  **Change visibility > Public** if the package is private by default.
- Find the package URL: `ghcr.io/<your-github-username-lowercase>/lab12-web:v1`.

## Azure Cloud Shell Bash (after Bicep deployment)

    GH_OWNER="jusu-github-vardas-mazosiomis"
    az acr import -n "$ACR" \
      --source "ghcr.io/$GH_OWNER/lab12-web:v1" \
      --image lab12-web:v1
    az acr repository show-tags -n "$ACR" --repository lab12-web -o table
    az aks update -g "$RG" -n "$AKS" --attach-acr "$ACR"

- In `app.yaml` and Helm `values.yaml`, change `PAKEISKITE_ACR` to the real ACR name
  and `VARDAS_PAVARDE` to your identifying text.
- The `main.bicep` ACR uses **RBAC Registry Permissions** mode, so `--attach-acr`
  is expected to work if the user has permission to assign Azure roles.
- Never paste Azure secrets or credentials into GitHub source code.

## How to make V2

1. Change `IMAGE_MESSAGE` again in `app.js`, commit.
2. GitHub Actions > Run workflow > **v2**. Verify package image tag `v2`.
3. Cloud Shell: `az acr import -n "$ACR" --source "ghcr.io/$GH_OWNER/lab12-web:v2" --image lab12-web:v2`.
4. Set image tag to `v2` in `app.yaml`; use `kubectl apply` and see rolling update.
5. In the Helm section, delete manifest-controlled objects first, then `helm install`.

## Educational caveats

- Public GHCR means anyone can pull the demonstration image. Keep credentials
  and personal data out of the source code. Public GitHub repositories can use
  standard GitHub-hosted Actions runners without runner-minute charges.
- `az acr build` is often blocked on Azure for Students / free-credit subscriptions.
  Cloud Shell also has no Docker daemon. Neither is required by this lab.
- Docker image V1/V2 is different from Kubernetes `APP_TITLE` / `APP_COLOR`
  configuration, and from AKS control-plane / node upgrades.
- Some Azure for Students accounts lack role assignment permissions needed for
  `--attach-acr`; if so, ask lecturer to help or (for testing) reference the
  **public GHCR image directly** in Kubernetes YAML / Helm values.
- The `Standard_D2s_v4` AKS System Node size is an experiment: Azure's actual
  minimum SKU and quota requirements may differ; check the portal before building.
- CPU workload endpoint is intentionally public and must be used only in this
  short-lived classroom exercise. Delete the entire LAB12 RG after collecting proof.

## Smoke checks

    kubectl get deploy,pod,svc,hpa -n lab12
    helm lint ./helm/lab12-web
    helm template lab12 ./helm/lab12-web -n lab12
