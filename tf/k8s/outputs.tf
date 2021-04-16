output "labels" {
  value = local.labels
}

output "deployment" {
  value = kubernetes_deployment.main
}

output "service" {
  value = kubernetes_service.main
}
