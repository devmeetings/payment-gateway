upstream {{ server_id }} {
  server localhost:{{payments_port}};
  keepalive 32;
}

server {
  listen 80;
  {% if server_name == 'registration.devmeetings.com' %}
  server_name {{ server_name }} devmeetings.com devmeetings.pl devmeetings.org devmeetings.de *.devmeetings.com *.devmeetings.pl *.devmeetings.org *.devmeetings.de;
  {% else %}
  server_name {{ server_name }};
  {% endif %}

  location /components {
    root /srv/{{ server_name }}/public;
  }

  location /css {
    root /srv/{{ server_name }}/public;
  }

  location /js {
    root /srv/{{ server_name }}/public;
  }

  location /img {
    root /srv/{{ server_name }}/public;
  }

  location = / {
    if ($http_host = devmeetings.com) {
      rewrite / http://devmeetings.com/en;
    }
    if ($http_host = devmeetings.de) {
      rewrite / http://devmeetings.de/de;
    }

    proxy_pass http://{{ server_id }};
    proxy_set_header Host      $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    proxy_pass http://{{ server_id }};
    proxy_set_header Host      $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  error_page 502 /offline.html;
  
  location = /offline.html {
    root /srv/{{ server_name }}/;
  }

  location /nginx_status {
    # copied from http://blog.kovyrin.net/2006/04/29/monitoring-nginx-with-rrdtool/
    stub_status on;
    access_log   off;
  }

}
