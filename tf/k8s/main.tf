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
        labels      = local.labels
        annotations = var.pod_annotations
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

          # rabbitmq with rabbitmq_amqp1_0
          dynamic "env" {
            for_each = var.rabbitmq_name != "" ? {
              AMQP_HOST          = var.rabbitmq_name
              AMQP_PORT          = "5672"
              AMQP_TARGET_PREFIX = "/topic/${var.name}."
            } : {}
            content {
              name  = env.key
              value = env.value
            }
          }
          dynamic "env" {
            for_each = var.rabbitmq_name != "" ? {
              AMQP_USERNAME = "username"
              AMQP_PASSWORD = "password"
            } : {}
            content {
              name = env.key
              value_from {
                secret_key_ref {
                  name = "${var.rabbitmq_name}-default-user"
                  key  = env.value
                }
              }
            }
          }

          dynamic "env_from" {
            for_each = var.config_maps
            content {
              config_map_ref {
                name = env_from.value
              }
            }
          }
          dynamic "env_from" {
            for_each = var.secrets
            content {
              secret_ref {
                name = env_from.value
              }
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
        dynamic "topology_spread_constraint" {
          for_each = var.topology_spread_constraints
          content {
            max_skew           = topology_spread_constraint.value.max_skew
            topology_key       = topology_spread_constraint.value.topology_key
            when_unsatisfiable = topology_spread_constraint.value.when_unsatisfiable
            label_selector {
              match_labels = local.labels
            }
          }
        }
      }
    }
  }
  lifecycle {
    ignore_changes = [metadata[0].annotations]
  }
}
