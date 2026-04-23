terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

resource "google_compute_network" "vpc" {
  name                    = "diploma-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "diploma-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "diploma-allow-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["diploma-vm"]
}

resource "google_compute_firewall" "allow_web" {
  name    = "diploma-allow-web"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "3000", "3001"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["diploma-vm"]
}

resource "google_compute_address" "static_ip" {
  name   = "diploma-static-ip"
  region = var.region
}

resource "google_compute_instance" "app" {
  name         = "diploma-app"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = ["diploma-vm"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 30
      type  = "pd-standard"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id

    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  metadata = {
    ssh-keys = "${var.ssh_user}:${file(var.ssh_public_key_path)}"
  }

  metadata_startup_script = file("${path.module}/startup.sh")
}
