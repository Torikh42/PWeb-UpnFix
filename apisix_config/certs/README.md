# Direktori ini akan berisi sertifikat SSL self-signed untuk APISIX.
# File cert.pem dan key.pem di-generate menggunakan OpenSSL.
#
# Jalankan perintah berikut di root direktori proyek:
#
#   mkdir -p apisix_config/certs
#   openssl req -x509 -newkey rsa:2048 -nodes \
#     -keyout apisix_config/certs/key.pem \
#     -out apisix_config/certs/cert.pem -days 365 \
#     -subj "/CN=localhost"
#
# File *.pem sudah masuk ke .gitignore dan .dockerignore.
# Di-mount ke container APISIX via Docker volume (bukan di-COPY ke image).
