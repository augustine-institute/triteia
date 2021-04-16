locals {
  labels = merge({ app = var.name }, var.additional_labels)
}

resource "kubernetes_deployment" "main" {
  metadata {
    namespace = var.namespace
    name      = var.name
    labels    = local.labels
  }

  spec {
    replicas = var.autoscaling_range[0]

    selector {
      match_labels = local.labels
    }

    template {
      metadata {
        labels = local.labels
      }

      spec {
        service_account_name = kubernetes_service_account.main.metadata.0.name

        container {
          name  = "triteia"
          image = var.image
          port {
            name           = "http"
            container_port = 3000
          }

          resources {
            requests = var.resources.requests
            limits   = var.resources.limits
          }

          env {
            name  = "NODE_ENV"
            value = var.node_env
          }
          env_from {
            prefix = "DB_"
            secret_ref {
              name = var.db_secret_name
            }
          }

          liveness_probe {
            http_get {
              port = 3000
              path = "/health"
            }
          }
          readiness_probe {
            http_get {
              port = 3000
              path = "/health"
            }
          }
        }
      }
    }
  }
}
