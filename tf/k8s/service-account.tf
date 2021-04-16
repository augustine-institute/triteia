resource "kubernetes_service_account" "main" {
  metadata {
    namespace = var.namespace
    name      = var.name
  }
}

resource "kubernetes_role" "main" {
  metadata {
    namespace = var.namespace
    name      = var.name
  }
  rule {
    api_groups = [""]
    resources  = ["secrets"]
    resource_names = [
      var.db_secret_name,
    ]
    verbs = ["get", "list", "watch"]
  }
}

resource "kubernetes_role_binding" "main" {
  metadata {
    namespace = var.namespace
    name      = var.name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = var.name
  }
  subject {
    kind = "ServiceAccount"
    name = var.name
  }
}
