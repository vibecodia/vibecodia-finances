# Kubernetes migration scaffold

This directory contains the initial Kustomize-based Kubernetes layout for the project migration.

## Current structure

- `base/`: shared manifests for the application and ingress/cert-manager wiring.
- `base/backend/`: backend Deployment, Service, ConfigMap, Secret, and Kustomize entry.
- `base/frontend/`: placeholder folder for future frontend manifests.
- `base/cert-manager/`: `ClusterIssuer` and `Certificate` manifests for future TLS automation.
- `base/ingress.yaml`: NGINX `Ingress` resource routing `/` to the frontend and `/api` to the backend.
- `overlays/dev/`: development overlay entrypoint.
- `overlays/prod/`: production overlay entrypoint.

## Runtime routing assumptions

The backend API is currently exposed under the `/api` prefix in the application server, so the ingress is configured to match that contract.

- `/` → frontend service
- `/api` → backend service

## TLS preparation

The ingress is prepared for TLS by referencing a `vibecodia-tls` secret.

The `cert-manager` section is scaffolded to support a `ClusterIssuer` (`letsencrypt-prod`) and a `Certificate` that will populate the secret automatically once the cluster has `cert-manager` installed.

## Important notes

- No application code was modified for this migration scaffold.
- No `kubectl apply` was performed here.
- The manifests are designed to be extended later with environment-specific overlays or real image references.

## Example Kustomize commands

```bash
kubectl kustomize infra/k8s/base
kubectl kustomize infra/k8s/overlays/dev
kubectl kustomize infra/k8s/overlays/prod
```
