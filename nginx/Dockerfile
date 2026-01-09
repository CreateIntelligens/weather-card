FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/

# Expose port 8909
EXPOSE 8909

CMD ["nginx", "-g", "daemon off;"]
