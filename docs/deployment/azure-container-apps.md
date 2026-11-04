# Manual Docker deployment to Azure Container Apps

This guide builds the API and web images locally, pushes them to Azure Container Registry (ACR), and updates their existing Container Apps. Run commands from the repository root unless a step says otherwise.

## Prerequisites

- Docker Engine is running and your account can use it without `sudo`.
- Azure CLI is signed in: `az login`.
- ACR, the resource group, Container Apps environment, and the API and web Container Apps already exist.
- Your identity has permission to push images to ACR. The Container Apps' registry identity needs pull permission (`AcrPull`) on the registry.
- Runtime configuration and secrets are set on the Container Apps in Azure. Do not put runtime secrets in Docker build arguments, images, or source files.

## Set deployment names

Replace these example values with your Azure resource names. The ACR resource name is the part before `.azurecr.io`.

```bash
ACR_NAME="yourregistryname"
REGISTRY="${ACR_NAME}.azurecr.io"
RESOURCE_GROUP="rg-athlete-passport-prod"
API_CONTAINER_APP="athlete-api"
WEB_CONTAINER_APP="athlete-web"
IMAGE_TAG="manual-20261104-01"
```

Use a new tag for every deployment rather than reusing `latest`. For example, change the date and suffix in `IMAGE_TAG` each time.

## Authenticate to ACR

```bash
az login
az acr login --name "$ACR_NAME"
```

`az acr login` uses your signed-in Azure identity for local push access. The login token expires, so run it again before a later push if needed. See [ACR Docker CLI authentication](https://learn.microsoft.com/azure/container-registry/container-registry-get-started-docker-cli).

## Build and tag the API image

The API Dockerfile builds from the monorepo root so Yarn can resolve workspace packages and the shared Prisma schema.

```bash
docker build \
  -f apps/api/Dockerfile \
  -t "$REGISTRY/athlete-api:$IMAGE_TAG" \
  .
```

## Build and tag the web image

The Next.js public settings are build-time values. Set them to the production API and Supabase project. The Supabase anon key is publishable; do not pass service-role keys, database credentials, Redis credentials, or the encryption key as build arguments.

```bash
NEXT_PUBLIC_API_URL="https://api.example.com/trpc"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-publishable-anon-key"

docker build \
  -f apps/web/Dockerfile \
  -t "$REGISTRY/athlete-web:$IMAGE_TAG" \
  --build-arg "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  .
```

Both commands use `.` as the build context. Keep it: the Dockerfiles need repository files outside their own `apps/*` directory. The root `.dockerignore` excludes local environment files and generated output from that context.

## Push both images to ACR

```bash
docker push "$REGISTRY/athlete-api:$IMAGE_TAG"
docker push "$REGISTRY/athlete-web:$IMAGE_TAG"
```

You can confirm the tags are present with:

```bash
az acr repository show-tags --name "$ACR_NAME" --repository athlete-api --output table
az acr repository show-tags --name "$ACR_NAME" --repository athlete-web --output table
```

## Deploy the new image tags

Update the Container Apps to create revisions using the pushed images:

```bash
az containerapp update \
  --name "$API_CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$REGISTRY/athlete-api:$IMAGE_TAG"

az containerapp update \
  --name "$WEB_CONTAINER_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$REGISTRY/athlete-web:$IMAGE_TAG"
```

The web Container App must target port `3000` and have `WEB_URL` set to the exact public web origin, with no path. Its `NEXT_PUBLIC_*` settings are already embedded in the image built above. Keep the API's production environment variables and secrets configured on the API Container App; image updates do not replace those settings.

After each update, check the Container App's **Revisions and replicas** and logs in the Azure portal. Confirm the latest revision is healthy, then request a public API procedure and load the web app through its custom domain.

## Updating only one app

If only the API or web app changed, build and push only that image, then run the matching `az containerapp update` command. Keep the same unique tag for both images when they are part of one deployment; otherwise use a distinct tag per image, such as `manual-20261104-web-01`.

