upstream payments {
  server localhost:{{payments_port}};
  keepalive 32;
}

server {
  listen 80;
  server_name registration.devmeetings.com;
  
  location /components {
    root /srv/registration.devmeetings.com/public/components;
  }

  location /css {
    root /srv/registration.devmeetings.com/public/css;
  }

  location /js {
    root /srv/registration.devmeetings.com/public/js;
  }

  location /img {
    root /srv/registration.devmeetings.com/public/img;
  }

  location / {
    proxy_pass http://payments;
    proxy_set_header Host      $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  error_page 502 /offline.html
  
  location = /offline.html {
    root /srv/registration.devmeetings.com/;
  }

  location /nginx_status {
    # copied from http://blog.kovyrin.net/2006/04/29/monitoring-nginx-with-rrdtool/
    stub_status on;
    access_log   off;
  }

}
