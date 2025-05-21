import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewChildren,
  QueryList,
  ChangeDetectorRef,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { environment } from "../../../environments/environment";
import { MatGridListModule } from "@angular/material/grid-list";
import { BehaviorSubject } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { UserEventsService } from "../../services/user-events.service";
import { MatSnackBar } from "@angular/material/snack-bar";
@Component({
  selector: "app-room",
  templateUrl: "./room.component.html",
  standalone: true,
  imports: [CommonModule, MatIconModule, MatGridListModule],
  styleUrls: ["./room.component.css"],
})
export class RoomComponent implements OnInit, OnDestroy {
  [x: string]: any;
  roomId: string;
  myPeer: Peer | null = null;
  socket: any;
  myVideoStream: MediaStream | null = null;
  audioEnabled: boolean = true;
  videoEnabled: boolean = true;
  remoteStreams$ = new BehaviorSubject<
    { userId: string; stream: MediaStream }[]
  >([]);

  private userStreamMap: { [key: string]: string } = {};
  localName: string = "";
  isHost: boolean = false;

  @ViewChild("localVideo") localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChildren("remoteVideo") remoteVideos!: QueryList<
    ElementRef<HTMLVideoElement>
  >;

  private peers: { [key: string]: any } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private _snackBar: MatSnackBar,
    private userEventsService: UserEventsService
  ) {
    this.roomId = this.route.snapshot.paramMap.get("id")!;
  }

  ngOnInit(): void {
    this.isHost = localStorage.getItem("isHost") === "true";
    if (this.authService.getToken()) {
      this.localName = this.authService.name;
    }
    this.userEventsService.joinLeaveMessages$.subscribe((message) => {
      this._snackBar.open(message, "Close", {
        duration: 3000,
        panelClass: ["info-snackbar"],
      });
    });
    // setup for localhost
    this.socket = io("http://localhost:3000", {
      transports: ["polling"],
    });
    // setup for production
    // this.socket = io(environment.socketUrl, {
    //   transports: ["polling"],
    // });
    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id, this.socket.connected);
      this.myPeer = new Peer({
        host: environment.peerJsUrl,
        path: "/peerjs",
        secure: true,
      });

      this.myPeer.on("open", (id) => {
        this.socket.emit("join-room", this.roomId, id, this.localName);
        this.userStreamMap[id] = this.localName;
      });

      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: true,
        })
        .then((stream) => {
          this.myVideoStream = stream;
          this.localVideo.nativeElement.srcObject = stream;

          this.myPeer?.on("call", (call) => {
            call.answer(stream);
            call.on("stream", (userVideoStream) => {
              this.addRemoteStream(userVideoStream, call.peer, "");
            });
          });

          this.socket.on(
            "user-joined",
            (userId: string, participantName: string) => {
              this.connectToNewUser(userId, stream, participantName);
              this.userEventsService.notify(
                `${participantName} joined the room.`
              );
            }
          );

          this.socket.on("user-disconnected", (userId: string) => {
            if (this.peers[userId]) {
              this.peers[userId].close();
              this.removeRemoteStream(userId);
              this.userEventsService.notify(
                `${this.userStreamMap[userId]} left the room.`
              );
            }
          });
          this.socket.on("mute-all", () => {
            this.audioEnabled = false;
            this.toggleAudio(); // disables audio
            alert("Host muted everyone.");
          });
          this.socket.on("end-meeting", () => {
            alert("Host ended the meeting.");
            this.endCall(); // clean up resources
          });
        });
    });
  }

  connectToNewUser(
    userId: string,
    stream: MediaStream,
    participantName: string
  ): void {
    const call = this.myPeer?.call(userId, stream);
    call?.on("stream", (userVideoStream) => {
      this.addRemoteStream(userVideoStream, userId, participantName);
    });
    call?.on("close", () => {
      this.removeRemoteStream(userId);
    });
    this.peers[userId] = call;
  }

  addRemoteStream(stream: MediaStream, userId: string, name: string): void {
    const currentStreams = this.remoteStreams$.getValue();
    const existing = currentStreams.find((s) => s.userId === userId);
    if (!existing) {
      this.userStreamMap[userId] = name;
      this.remoteStreams$.next([...currentStreams, { userId, stream }]);
    }
  }

  removeRemoteStream(userId: string): void {
    const currentStreams = this.remoteStreams$.getValue();
    const target = currentStreams.find((s) => s.userId === userId);
    if (target) {
      target.stream.getTracks().forEach((track) => track.stop()); // cleanup
    }
    this.remoteStreams$.next(currentStreams.filter((s) => s.userId !== userId));
    delete this.peers[userId];
    delete this.userStreamMap[userId];
  }

  // updateRemoteVideos(
  //   remoteStreamObjs: { userId: string; stream: MediaStream }[]
  // ): void {
  //   if (!this.remoteVideos) return;

  //   this.remoteVideos.forEach((videoElement, index) => {
  //     const streamObj = remoteStreamObjs[index];
  //     videoElement.nativeElement.srcObject = streamObj?.stream || null;
  //   });

  //   this.cdr.detectChanges();
  // }

  toggleAudio(): void {
    if (!this.myVideoStream) return;

    const audioTracks = this.myVideoStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    this.audioEnabled = !this.audioEnabled;
    audioTracks.forEach((track) => (track.enabled = this.audioEnabled));
  }

  toggleVideo(): void {
    this.videoEnabled = !this.videoEnabled;
    if (this.myVideoStream) {
      this.myVideoStream.getVideoTracks()[0].enabled = this.videoEnabled;
    }
  }

  endCall(): void {
    // Close all peer connections
    for (let peerId in this.peers) {
      if (this.peers[peerId]) {
        this.peers[peerId].close();
      }
    }
    if (this.myPeer) {
      this.myPeer.destroy();
      this.myPeer = null;
    }

    // Stop all tracks of the local video stream
    if (this.myVideoStream) {
      this.myVideoStream.getTracks().forEach((track) => track.stop());
      this.myVideoStream = null;
    }

    // Clear the local video element
    if (this.localVideo && this.localVideo.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }

    // Disconnect the socket
    if (this.socket) {
      this.socket.disconnect();
    }

    // Clear the remote streams array
    this.remoteStreams$.next([]);

    // Redirect to home page
    this.router.navigate(["/"]);
  }

  copyRoomId(): void {
    navigator.clipboard.writeText(this.roomId);
    alert("Room ID copied to clipboard");
  }

  ngOnDestroy(): void {
    this.endCall();
  }

  muteAll(): void {
    if (confirm("Are you sure you want to mute all participants?")) {
      this.socket.emit("mute-all");
    }
  }

  endMeetingForAll() {
    if (confirm("Are you sure you want to end the meeting for everyone?")) {
      this.socket.emit("end-meeting");
    }
  }
}
