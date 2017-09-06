upstream {{ server_id }} {
  server localhost:{{payments_port}};
  keepalive 32;
}

{% if server_name == 'registration.devmeetings.com' %}
map $geoip_country_code $closest_server {
  default devmeetings.com;
  PL      devmeetings.pl;
  DE      devmeetings.de;
  CH      devmeetings.de;
  AT      devmeetings.de;
}

geoip_country  /etc/nginx/geoip/GeoIP.dat;
geoip_city     /etc/nginx/geoip/GeoLiteCity.dat;
{% endif %}

server {
  listen 80;
  {% if server_name == 'registration.devmeetings.com' %}
  server_name {{ server_name }} devmeetings.com devmeetings.pl devmeetings.org devmeetings.de *.devmeetings.com *.devmeetings.pl *.devmeetings.org *.devmeetings.de;
  if ($http_host != devmeetings.org) {
    rewrite ^ $scheme://devmeetings.org$request_uri break;
  }
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
