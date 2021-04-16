variable "db_secret_name" {
  description = "The K8s secret containing the database env variables without the DB_ prefix"
}

variable "name" {
  default = "triteia"
}

variable "namespace" {
  default = "default"
}

variable "additional_labels" {
  default = {}
}

variable "image" {
  default = "augustineinstitute/triteia:latest"
}

variable "node_env" {
  default = "production"
}

variable "autoscaling_range" {
  default = [1, 1]
}

variable "service_type" {
  default = "ClusterIP"
}

variable "resources" {
  default = {
    requests = {
      cpu    = "128m"
      memory = "128Mi"
    }
    limits = {
      cpu    = "128m"
      memory = "256Mi"
    }
  }
}
