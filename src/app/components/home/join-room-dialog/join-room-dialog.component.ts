import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';

@Component({
  selector: "app-join-room-dialog",
  standalone: true,
  imports: [FormsModule, MatInputModule, MatDialogModule,ReactiveFormsModule],
  templateUrl: "./join-room-dialog.component.html",
  styleUrl: "./join-room-dialog.component.css",
})
export class JoinRoomDialogComponent {
  roomIdControl = new FormControl("");

  constructor(public dialogRef: MatDialogRef<JoinRoomDialogComponent>,private router: Router) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  joinRoom() {
    const roomId = this.roomIdControl.value;
    this.dialogRef.close();
    this.router.navigate(['/room',roomId])
  }
}
