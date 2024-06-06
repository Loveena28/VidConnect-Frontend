import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  standalone: true,
  imports: [FormsModule,MatInputModule,MatCardModule,MatCardModule],
  styleUrl: './home.component.css',
})
export class HomeComponent {
  roomId:string = ''

  constructor(private router: Router) {}

  createRoom() {
    const newRoomId = Math.random().toString(36).substring(2, 15);
    this.router.navigate(['/room', newRoomId]);
  }

  joinRoom() {
    if (this.roomId) {
      this.router.navigate(['/room', this.roomId]);
    }
  }
}
