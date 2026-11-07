#!/bin/sh
set -eu

key_url="https://tetra6.com/rescue-access/rpi5-to-laosda-church.pub"
expected="SHA256:s917Mi2C8MsDp9NnEqEDZikvxX5Y0+Jhi8Ucamfponc"
key_file="$(mktemp "${TMPDIR:-/tmp}/rpi5-church-key.XXXXXX")"
trap 'rm -f "$key_file"' EXIT HUP INT TERM

curl -fsS "$key_url" -o "$key_file"
downloaded="$(ssh-keygen -lf "$key_file" | awk '{print $2}')"

printf '\nExpected:   %s\nDownloaded: %s\n\n' "$expected" "$downloaded"
printf 'Do the fingerprints match? Install for macOS user %s? [y/N] ' "$(id -un)"
IFS= read -r answer
case "$answer" in
  y|Y|yes|YES) ;;
  *) echo "Not installed."; exit 1 ;;
esac

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
touch "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"

key="$(cat "$key_file")"
if grep -qxF "$key" "$HOME/.ssh/authorized_keys"; then
  echo "The rpi5 key was already installed for $(id -un)."
else
  printf '%s\n' "$key" >> "$HOME/.ssh/authorized_keys"
  echo "Installed the rpi5 key for $(id -un)."
fi
