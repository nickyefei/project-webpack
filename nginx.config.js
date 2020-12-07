http {
  server {
    listen 80;
    server_name jikejia.cn;
    root /metis/html/spa;
    index index.html;
    location ~^/favicon\.ico$ {
      root /metis/html/spa;
    }
    location / {
      try_files $uri $uri/ @fallback;
      proxy_set_header Host $host;
      proxy_set_header X-Real-Ip $remote_addr;
      proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;        
      proxy_set_header   X-Forwarded-Proto  $scheme;
    }
  
    location @fallback {
      rewrite ^.*$ /index.html break;
    }
  
    access_log /metis/logs/nginx/access.log  main;

    gzip on;
    gzip_static on;
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml+rss text/javascript;
    gzip_proxied any;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
  }
}