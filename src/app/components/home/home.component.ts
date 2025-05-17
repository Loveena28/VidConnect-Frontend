import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatInputModule } from "@angular/material/input";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";
import { MatDialog } from "@angular/material/dialog";
import { JoinRoomDialogComponent } from "./join-room-dialog/join-room-dialog.component";
import { AuthService } from "../../services/auth.service";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";
@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  standalone: true,
  imports: [
    FormsModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    CommonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  styleUrls: ["./home.component.css"],
})
export class HomeComponent {
  roomId: string = "";
  profilePicture: string = "";
  currentDate: number = Date.now();
  showLogout: boolean = false;
  userName: string = "";
  isDarkMode: boolean = false;

  constructor(
    private router: Router,
    public dialog: MatDialog,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (this.authService.getToken()) {
      this.profilePicture = this.authService.getProfilePicture();
      this.userName = this.authService.name;
    }
  }

  toggleLogout() {
    this.showLogout = !this.showLogout;
  }

  logout() {
    this.authService.logout();
  }

  createRoom() {
    const newRoomId = Math.random().toString(36).substring(2, 15);
    this.router.navigate(["/room", newRoomId]);
  }

  joinRoom() {
    const dialogRef = this.dialog.open(JoinRoomDialogComponent, {
      width: "250px",
    });
  }
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.body.classList.toggle("dark-mode", this.isDarkMode);
  }
}
