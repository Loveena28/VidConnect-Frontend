import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewChildren,
  QueryList,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { io, Socket } from "socket.io-client";
import Peer from "peerjs";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { environment } from "../../../environments/environment";
import { BehaviorSubject, Subscription } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { UserEventsService } from "../../services/user-events.service";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: "app-room",
  templateUrl: "./room.component.html",
  imports: [CommonModule, MatIconModule],
  styleUrls: ["./room.component.css"],
  standalone: true,
})
export class RoomComponent implements OnInit, OnDestroy {
  roomId: string = this.route.snapshot.paramMap.get("id")!;
  localName: string = "";
  isHost = false;

  socket!: Socket;
  myPeer: Peer | null = null;
  myVideoStream: MediaStream | null = null;
  audioEnabled = true;
  videoEnabled = true;

  remoteStreams$ = new BehaviorSubject<
  { userId: string; name: string; stream: MediaStream }[]
  >([]);
  private subscriptions: Subscription[] = [];
  // private userNameMap = new Map<string, string>();

  @ViewChild("localVideo") localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChildren("remoteVideo") remoteVideos!: QueryList<
    ElementRef<HTMLVideoElement>
  >;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private userEventsService: UserEventsService
  ) {}

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(["/login"]);
      return;
    }

    this.localName = this.authService.name;
    this.isHost = localStorage.getItem("isHost") === "true";

    this.setupUserNotification();
    this.initializeSocket();
  }

  private setupUserNotification(): void {
    const sub = this.userEventsService.joinLeaveMessages$.subscribe((msg) =>
      this.snackBar.open(msg, "Close", {
        duration: 3000,
        panelClass: ["info-snackbar"],
      })
    );
    this.subscriptions.push(sub);
  }

  private initializeSocket(): void {
    this.socket = io(environment.socketUrl, { transports: ["polling"] });

    this.socket.on("connect", () => {
      this.myPeer = new Peer({
        host: environment.peerJsUrl,
        path: "/peerjs",
        secure: true,
      });

      this.myPeer.on("open", (id) => {
        this.socket.emit("join-room", this.roomId, id, this.localName);
        this.getMediaAndSetupListeners();
      });
    });
  }

  private getMediaAndSetupListeners(): void {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        this.myVideoStream = stream;
        this.localVideo.nativeElement.srcObject = stream;

        this.myPeer?.on("call", (call) => {
          call.answer(this.myVideoStream!);
        
          call.on("stream", (remoteStream) => {
            const callerName = call.metadata?.name || "Guest";
            this.addRemoteStream(remoteStream, call.peer, callerName);
          });
        });

        // this.socket.on("existing-users", (users: { userId: string; name: string }[]) => {
        //   console.log(users)
        //   users.forEach(user => {
        //     if (!this.remoteStreams$.getValue().some(s => s.userId === user.userId)) {
        //       this.connectToNewUser(user.userId, this.myVideoStream!, user.name);
        //     }
        //   });
        // });

        this.socket.on("user-joined", (userId: string, name: string) => {
          // this.userNameMap.set(userId, name); // save name
          this.connectToNewUser(userId, this.myVideoStream!, name);
          this.userEventsService.notify(`${name} joined the room.`);
        });

        this.socket.on("user-disconnected", (userId: string, name: string) => {
          this.removeRemoteStream(userId);
          this.userEventsService.notify(`${name} left the room.`);
        });

        this.socket.on("mute-all", () => {
          this.audioEnabled = false;
          this.toggleAudio();
          alert("Host muted everyone.");
        });

        this.socket.on("end-meeting", () => {
          alert("Host ended the meeting.");
          this.endCall();
        });
      });
  }

  private connectToNewUser(userId: string, stream: MediaStream, name: string): void {
    const call = this.myPeer?.call(userId, stream);
    if (!call) return;
  
    call.on("stream", (userVideoStream) => {
      this.addRemoteStream(userVideoStream, userId, name);
    });
  
    call.on("close", () => this.removeRemoteStream(userId));
  }

  private addRemoteStream(stream: MediaStream, userId: string, name: string): void {
    const currentStreams = this.remoteStreams$.getValue();
    const existing = currentStreams.find((s) => s.userId === userId);

    if (!existing) {
      this.remoteStreams$.next([...currentStreams, { userId, stream, name }]);
    }
  }
  

  private removeRemoteStream(userId: string): void {
    const updated = this.remoteStreams$.value.filter(
      (s) => s.userId !== userId
    );
    this.remoteStreams$.next(updated);
  }

  toggleAudio(): void {
    if (!this.myVideoStream) return;

    const audioTracks = this.myVideoStream.getAudioTracks();
    if (!audioTracks.length) return;

    this.audioEnabled = !this.audioEnabled;
    audioTracks.forEach((track) => (track.enabled = this.audioEnabled));
  }

  toggleVideo(): void {
    if (!this.myVideoStream) return;

    this.videoEnabled = !this.videoEnabled;
    this.myVideoStream.getVideoTracks()[0].enabled = this.videoEnabled;
  }

  copyRoomId(): void {
    navigator.clipboard.writeText(this.roomId);
    alert("Room ID copied to clipboard");
  }

  muteAll(): void {
    if (confirm("Are you sure you want to mute all participants?")) {
      this.socket.emit("mute-all");
    }
  }

  endMeetingForAll(): void {
    if (confirm("End the meeting for everyone?")) {
      this.socket.emit("end-meeting");
    }
  }

  endCall(): void {
    this.myPeer?.destroy();
    this.myPeer = null;

    this.myVideoStream?.getTracks().forEach((track) => track.stop());
    this.myVideoStream = null;

    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }

    this.remoteStreams$.getValue().forEach(({ stream }) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    this.remoteStreams$.next([]);

    this.socket?.disconnect();
    this.router.navigate(["/"]);
  }

  ngOnDestroy(): void {
    this.endCall();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
