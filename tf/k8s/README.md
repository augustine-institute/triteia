# Terraform module for a Triteia Deployment in K8s

```HCL
local {
  namespace = "default"
}

module "triteia" {
  source = "../modules/k8s-deployment"

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
