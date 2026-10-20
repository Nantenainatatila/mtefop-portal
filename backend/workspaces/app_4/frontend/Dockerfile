FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN if [ -f package-lock.json ]; then \
npm ci --include=dev --no-audit --no-fund; \
else \
npm install --include=dev --no-audit --no-fund; \
fi

COPY . .

RUN npm run build

RUN mkdir -p /output

RUN if [ -d "dist" ]; then \
cp -r dist/. /output/; \
elif [ -d "build" ]; then \
cp -r build/. /output/; \
else \
echo "Impossible de trouver le dossier de build frontend."; \
exit 1; \
fi

# Le navigateur appelle le backend via nginx (même origine) : on retire
# l'origine http://localhost:PORT écrite en dur dans le code ou le .env
# (http://localhost:5000/api devient /api).
RUN find /output -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) \
-exec sed -i -E 's#https?://(localhost|127\.0\.0\.1)(:[0-9]+)?##g' {} +


FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /output /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
