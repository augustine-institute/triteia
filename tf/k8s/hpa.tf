resource "kubernetes_horizontal_pod_autoscaler" "main" {
  count = var.autoscaling_range[0] != var.autoscaling_range[1] ? 1 : 0

  metadata {
    namespace = var.namespace
    name      = var.name
    labels    = local.labels
  }
  spec {
    min_replicas = var.autoscaling_range[0]
    max_replicas = var.autoscaling_range[1]
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = var.name
    }
    target_cpu_utilization_percentage = 70
  }
}
