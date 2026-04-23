output "instance_ip" {
  description = "Public IP of the VM"
  value       = google_compute_address.static_ip.address
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh ${var.ssh_user}@${google_compute_address.static_ip.address}"
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "http://${google_compute_address.static_ip.address}:3000"
}

output "api_url" {
  description = "API Gateway URL"
  value       = "http://${google_compute_address.static_ip.address}:3001"
}
