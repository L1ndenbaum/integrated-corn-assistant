Change log - 0018

Summary:
- Renamed server-go to static-server and removed API/DB code, leaving only static asset serving.
- Updated client build output path to static-server/out/static/out.
- Added Nginx container config to route traffic to static-server and api-gateway.

Files:
- static-server/app.go
- static-server/Dockerfile
- client/build.sh
- infra/nginx/nginx.conf
- infra/nginx/conf.d/static.conf
- infra/nginx/conf.d/gateway.conf
- infra/nginx/Dockerfile
- docs/architecture.md
