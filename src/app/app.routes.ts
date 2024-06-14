import { Routes } from "@angular/router";
import { HomeComponent } from "./components/home/home.component";
import { RoomComponent } from "./components/room/room.component";
import { LoginComponent } from "./components/login/login.component";
import { authGuard } from "./services/auth.guard";

export const routes: Routes = [
  { path: "", redirectTo: "/login", pathMatch: "full" },
  { path: "login", component: LoginComponent },
  {
    path: "home",
    component: HomeComponent,
    canActivate: [authGuard],
  },
  { path: "room/:id", component: RoomComponent },
];
