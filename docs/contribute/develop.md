# Developer guide

This guide is for contributors who want to understand the codebase, make changes, or help maintain the project.

## Architecture overview

### How it works

1. **Templates**: Jinja2 templates render the initial HTML structure for the profile selection form
2. **React App**: JavaScript/React code handles the interactive UI, form state, and dynamic features
3. **Webpack**: Bundles the frontend code and outputs it to `static/`
4. **HTTP Handlers**: JupyterHub serves the static assets when the profile page loads
5. **KubeSpawner Integration**: The `setup_ui()` function configures KubeSpawner to use these templates and handlers

## Design philosophy

Keep this tool a fairly simple React app focused on profile selection.
This won't become a super-heavy, complex application. 

### Why react?

```{pull-quote}
If this file gets over 200 lines of code long (not counting docs / comments), start using a framework

-- From the [BinderHub JS Source Code](https://github.com/jupyterhub/binderhub/blob/036877ffdf0abfde7e84f3972c7d0478cf4f7cb2/binderhub/static/js/index.js#L1)
```

The file _did_ get more than 200 lines long, and BinderHub learned this lesson the hard way. For this project:

- **Lightweight**: Plain React without TypeScript keeps it approachable
- **Mainstream**: Attracts frontend developers and contributors
- **Just Right**: Complex enough for multiple interactive features, not so heavy that it's hard to maintain
- **Single Page**: Perfect scope for React—one complex page with state management

## Development setup

### Setting up a local Kubernetes cluster

We will run a local Kubernetes cluster and point our local JupyterHub instance at it. This allows us to spawn pods in the local cluster and test the user experience end-to-end without needing a remote cluster.

1. Download, set up, and start [minikube](https://minikube.sigs.k8s.io/docs/start/) or [colima](https://colima.run/).

   **For Mac OS users:** The minikube docker driver does not allow the host machine to communicate with pods inside the cluster, which is required for our development workflow. To work around this, either use [colima](https://colima.run/) (`colima start --kubernetes --network-address`), or configure minikube with the `qemu` driver and `socket_vmnet` networking as described in the [minikube docs](https://minikube.sigs.k8s.io/docs/drivers/qemu/#networking).

2. Get the kubernetes pod subnet range – for minikube, run

   ```bash
   export POD_SUBNET=$(kubectl get node minikube -o jsonpath="{.spec.podCIDR}")
   ```

   or for colima, run

   ```bash
   export POD_SUBNET=$(kubectl get node colima -o jsonpath="{.spec.podCIDR}")
   ```

3. Get the gateway IP address of the kubernetes cluster – for minikube, run

   ```bash
   export GATEWAY_IP=$(minikube ip)
   ```

   or for colima, get the virtual machine IP address with

   ```bash
   export GATEWAY_IP=$(colima ssh -- hostname -I | awk '{print $2}')
   ```

4. Add a route for your local host to reach the pod subnet via the gateway IP address

   ```bash
   # Linux
   sudo ip route add $POD_SUBNET via $GATEWAY_IP
   # later on you can undo this with
   sudo ip route del $POD_SUBNET

   # macOS
   sudo route -n add -net $POD_SUBNET $GATEWAY_IP
   # later on you can undo this with
   sudo route delete -net $POD_SUBNET
   ```

### Troubleshooting

#### Local JupyterHub can't reach the Kubernetes cluster or user pods

If your locally running JupyterHub can't reach the Kubernetes cluster or the user pods running within it, work through these checks. The steps below use `$POD_SUBNET` and `$GATEWAY_IP` — set these first if you haven't already:

```bash
# minikube
export POD_SUBNET=$(kubectl get node minikube -o jsonpath="{.spec.podCIDR}")
export GATEWAY_IP=$(minikube ip)

# colima
export POD_SUBNET=$(kubectl get node colima -o jsonpath="{.spec.podCIDR}")
export GATEWAY_IP=$(colima ssh -- hostname -I | awk '{print $2}')
```

1. **Confirm kubectl is pointing at the right cluster**:

   ```bash
   kubectl config current-context
   ```

   Expected output: `minikube` or `colima`. If not, run `kubectl config use-context minikube` or `kubectl config use-context colima`.

2. **Confirm the node is ready**:

   ```bash
   # minikube
   kubectl get node minikube

   # colima
   kubectl get node colima
   ```

   The `STATUS` column should show `Ready`. If not, try `minikube start` or `colima start --kubernetes --network-address`.

3. **Confirm the VM is reachable from your host**:

   ```bash
   ping -c 3 $GATEWAY_IP
   ```

   If this fails, the VM itself is unreachable—restart minikube or colima.

4. **Confirm the pod CIDR route was added**:

   ```bash
   # Linux
   ip route show $POD_SUBNET

   # macOS
   netstat -rn | grep $GATEWAY_IP
   ```

   If no route is shown, re-run the `ip route add` / `route -n add` command from the previous step.

5. **Confirm a running pod is reachable**:

   ```bash
   # Find a pod IP
   kubectl get pods -A -o wide

   # Ping it
   ping -c 3 <pod-ip>
   ```

   If steps 3 and 4 pass but this fails, the route is misconfigured—delete it and re-add it.

#### "Build your own image" fails with a Docker connection error

If you see an error like:

```
docker.errors.DockerException: Error while fetching server API version: ('Connection aborted.', FileNotFoundError(2, 'No such file or directory'))
```

Make sure `DOCKER_HOST` points to the correct socket. For colima users:

```bash
export DOCKER_HOST="unix://$HOME/.colima/default/docker.sock"
```

### Setting up the development environment

1. Clone the repository:
   ```bash
   git clone https://github.com/2i2c-org/jupyterhub-fancy-profiles.git
   cd jupyterhub-fancy-profiles
   ```

2. Set up a virtual environment (using `venv`, `conda`, etc.)

3. Install Python dependencies:
   ```bash
   pip install -r dev-requirements.txt
   pip install -e .
   ```

   This also builds the JS and CSS assets.

4. Install [configurable-http-proxy](https://github.com/jupyterhub/configurable-http-proxy/) (required for JupyterHub):
   ```bash
   npm install configurable-http-proxy
   ```

5. Add `configurable-http-proxy` to your `$PATH`:
   ```bash
   export PATH="$(pwd)/node_modules/.bin:${PATH}"
   ```

6. Start JupyterHub and navigate to `localhost:8000`:
   ```bash
   jupyterhub
   ```

   You can login with any username and password.

   ```{tip}
   **Troubleshooting:** On macOS, if you see the error `Errno 8: Nodename nor servname provided`, try running `jupyterhub --ip=localhost` instead.
   ```

7. If working on JS/CSS, run this in another terminal to automatically watch and rebuild:
   ```bash
   npm run webpack:watch
   ```

## Development workflow

### React app changes

`npm run webpack:watch` automatically rebuilds the JS/CSS when you save a file. However, the browser caches the old bundle, so you might need to reload or force-reload the page to pick up the new assets.

### JupyterHub config and Jinja template changes

Changes to `jupyterhub_config.py` or the Jinja2 templates require a **JupyterHub restart** to take effect. Stop the running `jupyterhub` process and start it again.

## Testing

Tests for the frontend use [Jest](https://jestjs.io) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for rendering components and asserting DOM state.

### Run all tests

```bash
npm test
```

### Run specific test suite

To run tests in a specific file (e.g., `ProfileForm.test.tsx`):

```bash
npm test ProfileForm
```

## Making a release

We use [automation](https://github.com/pypa/gh-action-pypi-publish/) to publish releases to [PyPI](https://pypi.org/project/jupyterhub-fancy-profiles/). Release early and often!

### Creating the release

1. **Update your local checkout**:
   ```bash
   git checkout main
   git stash  # if needed
   git pull upstream main  # or origin, as needed
   ```

2. **Create a new git tag**:
   ```bash
   git tag -a v<version-number>
   ```

   In the tag message, at minimum write: `Version <version-number>`

   Ideally, include a brief changelog of notable changes.

3. **Push your tag to GitHub**:
   ```bash
   git push origin --tags
   ```

4. **Done!** A new release will automatically be published to PyPI.

### Generating release notes

After making the release:

1. Install `github-activity`:
   ```bash
   pip install github-activity
   ```

2. Generate release notes using the previous and current release tags:
   ```bash
   github-activity 2i2c-org/jupyterhub-fancy-profiles -s <last-release-tag> -u <this-release-tag>
   ```

   For example, for v0.5.0:
   ```bash
   github-activity 2i2c-org/jupyterhub-fancy-profiles -s v0.4.0 -u v0.5.0
   ```

3. Copy the output and rearrange/categorize as needed. `github-activity` will automatically group PRs based on tags (e.g., `enhancement`, `bug`) or prefixes (e.g., `[ENH]`, `[BUG]`).

4. [Create a GitHub release](https://github.com/2i2c-org/jupyterhub-fancy-profiles/releases/new), use the tag as the title, and paste in the generated release notes.

5. Click **Publish Release**.
