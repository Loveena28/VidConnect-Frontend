import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { JoinRoomDialogComponent } from './join-room-dialog/join-room-dialog.component';


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
  ],
  styleUrl: "./home.component.css",
})
export class HomeComponent {
  roomId: string = "";
  currentDate: number = Date.now();

  constructor(private router: Router, public dialog: MatDialog) {}

  createRoom() {
    const newRoomId = Math.random().toString(36).substring(2, 15);
    this.router.navigate(["/room", newRoomId]);
  }

  joinRoom() {
    const dialogRef = this.dialog.open(JoinRoomDialogComponent, {
      width: "250px",
      data: {},
    });
  }
}
