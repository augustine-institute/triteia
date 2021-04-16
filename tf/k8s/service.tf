resource "kubernetes_service" "main" {
  metadata {
    namespace = var.namespace
    name      = var.name
    labels    = local.labels
  }
  spec {
    selector = local.labels

    type = var.service_type
    port {
      port        = 80
      target_port = 3000
    }
  }
}

# only allow access from inside this namespace
resource "kubernetes_network_policy" "main" {
  metadata {
    namespace = var.namespace
    name      = var.name
  }

  spec {
    pod_selector {
      match_labels = local.labels
    }

    ingress {
      from {
        pod_selector {}
      }
      ports {
        port     = "http"
        protocol = "TCP"
      }
    }

    policy_types = ["Ingress"]
  }
}
