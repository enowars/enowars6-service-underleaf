FROM python:3

COPY requirements.txt .
RUN apt update -y && apt install poppler-utils ncat -y && pip3 install -r requirements.txt

COPY . .
WORKDIR .

ENTRYPOINT [ "gunicorn", "-c", "gunicorn.conf.py", "checker:app" ]