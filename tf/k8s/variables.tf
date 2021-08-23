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

variable "service_labels" {
  default = {}
}

variable "pod_annotations" {
  description = "annotations for pods such as `fluentbit.io/parser = nestjs`"
  default     = {}
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

variable "config_maps" {
  description = "Names of additional config maps for env variables"
  default     = []
}

variable "secrets" {
  description = "Names of additional secrets for env variables"
  default     = []
}

variable "rabbitmq_name" {
  description = "If rabbitmq was deployed using the official operator and rabbitmq_amqp1_0 plugin, pass the name of the cluster to configure a connection using the default user."
  default     = ""
}

variable "topology_spread_constraints" {
  default = [{
    topology_key       = "kubernetes.io/hostname"
    max_skew           = 1
    when_unsatisfiable = "ScheduleAnyway"
  }]
}
