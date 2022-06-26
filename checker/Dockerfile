FROM python:3

COPY requirements.txt .
RUN wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add - && \
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list &&\
apt update -y && apt install poppler-utils ncat mongodb-org -y && pip3 install -r requirements.txt

COPY . .
WORKDIR .

ENTRYPOINT [ "gunicorn", "-c", "gunicorn.conf.py", "checker:app" ]