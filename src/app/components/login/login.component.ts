/** @format */

import { Component } from "@angular/core";
import { AuthService } from "../../services/auth.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
})
export class LoginComponent {
  constructor(private authService: AuthService, private router: Router) {}
  ngOnInit(): void {
    if (this.authService.getToken()) {
      this.router.navigate(["/home"]);
    }
  }
  login() {
    this.authService.login();
  }
}
