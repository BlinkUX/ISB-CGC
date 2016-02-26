./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/${PROD_ENV_FILE}" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/${PROD_CERT_FILE}" ./client-cert.pem
./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/${PROD_KEY_FILE}" ./client-key.pem
./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/${PROD_CA_FILE}" ./server-ca.pem
./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/${PROD_SECRETS_FILE}" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/${PROD_PEM_FILE}" ./privatekey.pem
if [ -n "${NIH_AUTH_ON}" ]; then
  ./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/dev-files/saml/advanced_settings.json" ./saml/advanced_settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/dev-files/saml/settings.json" ./saml/settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/dev-files/saml/certs/cert.pem" ./saml/certs/cert.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/dev-files/saml/certs/key.pem" ./saml/certs/key.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${PROD_GCLOUD_BUCKET}/dev-files/NIH_FTP.txt" ./NIH_FTP.txt
fi
