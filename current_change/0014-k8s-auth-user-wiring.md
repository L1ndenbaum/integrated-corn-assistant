Change log - 0014

Summary:
- Added k8s manifests for auth-service and user-service with service DNS wiring.
- Documented k3s wiring and example login test.
- Added gin dependency for user-service.

Files:
- deploy/k8s/auth-service.yaml
- deploy/k8s/user-service.yaml
- deploy/k8s/README.md
- docs/auth.md
- services/user-service/go.mod
