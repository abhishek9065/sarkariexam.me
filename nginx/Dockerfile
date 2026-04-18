FROM nginx:alpine

# Install openssl for generating self-signed certs
RUN apk add --no-cache openssl

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy user-provided certificates (if any)
COPY ssl/ /etc/nginx/ssl/

# Generate self-signed certificate if Cloudflare Origin certs are missing
RUN if [ -f /etc/nginx/ssl/origin.crt ] && [ -f /etc/nginx/ssl/origin.key ]; then \
        cp /etc/nginx/ssl/origin.crt /etc/nginx/ssl/nginx.crt && \
        cp /etc/nginx/ssl/origin.key /etc/nginx/ssl/nginx.key; \
    else \
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx.key \
        -out /etc/nginx/ssl/nginx.crt \
        -subj "/C=IN/ST=State/L=City/O=SarkariExams/CN=sarkariexams.me"; \
    fi

# Copy the custom nginx config
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
