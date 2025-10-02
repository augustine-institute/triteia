# Terraform for a Triteia Deployment in K8s

```HCL
local {
  namespace = "default"
}

module "triteia" {
  source = "git::https://gitlab.com/5stones/tf-modules//k8s/app"

  namespace  = local.namespace
  name       = "triteia"
  image      = "augustineinstitute/triteia:1.5.0"
  port       = 3000
  probe_path = "/health"

  autoscaling_range = [2, 2]

  resources = {
    requests = {
      cpu    = "50m"
      memory = "100Mi"
    }
    limits = {
      memory = "100Mi"
    }
  }

  env = {
    # log changes to records ("full", "event", or "meta")
    #LOG_EVENTS = "full"

    # send events through RabbitMQ
    #AMQP_HOST          = "rabbit"
    #AMQP_PORT          = "5672"
    #AMQP_TARGET_PREFIX = "/topic/triteia."
  }
  secrets = {
    (kubernetes_secret_v1.triteia.metadata.0.name) = ""
  }
}

resource "kubernetes_secret_v1" "triteia" {
  metadata {
    namespace = local.namespace
    name      = "triteia"
    labels    = module.triteia.labels
  }
  data = {
    # TODO fill in your DB connection info for mariadb or postgres
    DB_VENDOR   = "mariadb"
    DB_HOST     = ""
    DB_PORT     = "3306"
    DB_NAME     = "db_name"
    DB_USER     = ""
    DB_PASSWORD = ""

    #AMQP_USERNAME = data.kubernetes_secret_v1.rabbit.data.username
    #AMQP_PASSWORD = data.kubernetes_secret_v1.rabbit.data.password
  }
}

# pull AMQP username and password from the secret that the RabbitMQ operator creates
#data "kubernetes_secret_v1" "rabbit" {
#  metadata {
#    namespace = local.namespace
#    name      = "rabbit-default-user"
#  }
#}
```


## Deprecated Internal Module

```HCL
local {
  namespace = "default"
}

module "triteia" {
  source = "github.com/augustine-institute/triteia//tf/k8s"

  namespace      = local.namespace
  db_secret_name = kubernetes_secret.triteia_db.metadata.0.name
}

resource "kubernetes_secret" "triteia_db" {
  metadata {
    namespace = local.namespace
    name      = "triteia-db"
  }
  data = {
    VENDOR   = "mariadb"
    HOST     = ""
    PORT     = "3306"
    NAME     = "db_name"
    USER     = ""
    PASSWORD = ""
  }
}
```
