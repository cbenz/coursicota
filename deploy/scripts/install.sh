#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-coursicota}"
APP_HOME="${APP_HOME:-/home/${APP_USER}}"
APP_NAME="coursicota"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INSTALL_DIR="${INSTALL_DIR:-${APP_HOME}/apps/${APP_NAME}}"
REPO_URL="${REPO_URL:-}"
REPO_BRANCH="${REPO_BRANCH:-}"
DOMAIN="${DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
BASIC_AUTH_USER="${BASIC_AUTH_USER:-}"
BASIC_AUTH_PASSWORD="${BASIC_AUTH_PASSWORD:-}"
ENV_DIR="${ENV_DIR:-${APP_HOME}/etc}"
DATA_DIR="${DATA_DIR:-${APP_HOME}/data}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NGINX_AVAILABLE="/etc/nginx/sites-available/${APP_NAME}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${APP_NAME}.conf"
BASIC_AUTH_FILE="/etc/nginx/.htpasswd-${APP_NAME}"
ACME_WEBROOT="/var/www/certbot"

require_root() {
  if [[ ${EUID} -ne 0 ]]; then
    echo "This installer must be run as root." >&2
    exit 1
  fi
}

ensure_user() {
  if ! id -u "${APP_USER}" >/dev/null 2>&1; then
    useradd --create-home --home-dir "${APP_HOME}" --shell /bin/bash "${APP_USER}"
  fi
}

ensure_prerequisites() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y ca-certificates curl git nginx certbot apache2-utils nodejs npm python3 build-essential pkg-config
}

require_deploy_inputs() {
  if [[ -z "${DOMAIN}" ]]; then
    echo "Missing DOMAIN. Example: DOMAIN=app.example.com" >&2
    exit 1
  fi

  if [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
    echo "Missing LETSENCRYPT_EMAIL. Example: LETSENCRYPT_EMAIL=admin@example.com" >&2
    exit 1
  fi

  if [[ -z "${BASIC_AUTH_USER}" ]]; then
    echo "Missing BASIC_AUTH_USER. Example: BASIC_AUTH_USER=admin" >&2
    exit 1
  fi

  if [[ -z "${BASIC_AUTH_PASSWORD}" ]]; then
    echo "Missing BASIC_AUTH_PASSWORD." >&2
    exit 1
  fi
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.20.0 --activate
    return
  fi

  npm install -g pnpm@10.20.0
}

detect_repo_defaults() {
  if [[ -z "${REPO_URL}" ]]; then
    REPO_URL="$(git -C "${SOURCE_DIR}" config --get remote.origin.url || true)"
  fi

  if [[ -z "${REPO_URL}" ]]; then
    REPO_URL="https://github.com/cbenz/coursicota"
  fi

  if [[ -z "${REPO_BRANCH}" ]]; then
    REPO_BRANCH="$(git -C "${SOURCE_DIR}" rev-parse --abbrev-ref HEAD || true)"
  fi

  if [[ -z "${REPO_BRANCH}" || "${REPO_BRANCH}" == "HEAD" ]]; then
    REPO_BRANCH="main"
  fi
}

clone_or_update_repository() {
  install -d -o "${APP_USER}" -g "${APP_USER}" "$(dirname "${INSTALL_DIR}")"

  if [[ ! -d "${INSTALL_DIR}/.git" ]]; then
    runuser -u "${APP_USER}" -- git clone --branch "${REPO_BRANCH}" "${REPO_URL}" "${INSTALL_DIR}"
  else
    runuser -u "${APP_USER}" -- git -C "${INSTALL_DIR}" fetch --prune origin
    runuser -u "${APP_USER}" -- git -C "${INSTALL_DIR}" checkout "${REPO_BRANCH}"
    runuser -u "${APP_USER}" -- git -C "${INSTALL_DIR}" pull --ff-only origin "${REPO_BRANCH}"
  fi

  chown -R "${APP_USER}:${APP_USER}" "${INSTALL_DIR}"
}

ensure_runtime_directories() {
  install -d -o "${APP_USER}" -g "${APP_USER}" "${ENV_DIR}" "${DATA_DIR}"

  cat > "${ENV_DIR}/${APP_NAME}.env" <<EOF
PORT=3001
CARREFOUR_MCP_SERVER_URL=https://${DOMAIN}/mcp
CARREFOUR_MCP_BASIC_AUTH_USER=${BASIC_AUTH_USER}
CARREFOUR_MCP_BASIC_AUTH_PASSWORD=${BASIC_AUTH_PASSWORD}
EOF
  chown "${APP_USER}:${APP_USER}" "${ENV_DIR}/${APP_NAME}.env"
  chmod 0640 "${ENV_DIR}/${APP_NAME}.env"
}

install_service() {
  install -D -m 0644 "${INSTALL_DIR}/deploy/systemd/${APP_NAME}.service" "${SERVICE_FILE}"
}

render_nginx_template() {
  local template_path="$1"
  local output_path="$2"
  sed \
    -e "s|__DOMAIN__|${DOMAIN}|g" \
    -e "s|__BASIC_AUTH_FILE__|${BASIC_AUTH_FILE}|g" \
    "${template_path}" > "${output_path}"
}

install_basic_auth_file() {
  htpasswd -bc "${BASIC_AUTH_FILE}" "${BASIC_AUTH_USER}" "${BASIC_AUTH_PASSWORD}"
  chmod 0640 "${BASIC_AUTH_FILE}"
  chown root:www-data "${BASIC_AUTH_FILE}"
}

install_nginx_bootstrap_configuration() {
  install -d -m 0755 "${ACME_WEBROOT}"
  render_nginx_template "${INSTALL_DIR}/deploy/systemd/nginx-bootstrap.conf" "${NGINX_AVAILABLE}"
  ln -sfn "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

request_lets_encrypt_certificate() {
  certbot certonly \
    --non-interactive \
    --agree-tos \
    --keep-until-expiring \
    --email "${LETSENCRYPT_EMAIL}" \
    --webroot \
    -w "${ACME_WEBROOT}" \
    -d "${DOMAIN}"
}

install_nginx_final_configuration() {
  render_nginx_template "${INSTALL_DIR}/deploy/systemd/nginx.conf" "${NGINX_AVAILABLE}"
  nginx -t
}

build_application() {
  runuser -u "${APP_USER}" -- bash -lc "cd '${INSTALL_DIR}' && env HOME='${APP_HOME}' PATH='${PATH}' pnpm install --frozen-lockfile"
  runuser -u "${APP_USER}" -- bash -lc "cd '${INSTALL_DIR}' && env HOME='${APP_HOME}' PATH='${PATH}' pnpm build"
}

main() {
  require_root
  require_deploy_inputs
  ensure_prerequisites
  ensure_user
  ensure_pnpm
  detect_repo_defaults
  clone_or_update_repository
  ensure_runtime_directories
  install_service
  install_basic_auth_file
  install_nginx_bootstrap_configuration
  request_lets_encrypt_certificate
  install_nginx_final_configuration
  systemctl daemon-reload
  build_application
  systemctl enable --now "${APP_NAME}"
  systemctl reload nginx
}

main "$@"
