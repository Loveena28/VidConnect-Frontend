import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewChildren, QueryList } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { environment } from "../../../environments/environment";
import { MatGridListModule } from "@angular/material/grid-list";

@Component({
  selector: "app-room",
  templateUrl: "./room.component.html",
  standalone: true,
  imports: [CommonModule, MatIconModule, MatGridListModule],
  styleUrls: ["./room.component.css"],
})
export class RoomComponent implements OnInit, OnDestroy {
  roomId: string;
  myPeer: Peer | null = null;
  socket: any;
  myVideoStream: MediaStream | null = null;
  audioEnabled: boolean = true;
  videoEnabled: boolean = true;
  remoteStreams: MediaStream[] = [];

  @ViewChild("localVideo") localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChildren("remoteVideo") remoteVideos!: QueryList<ElementRef<HTMLVideoElement>>;

  private peers: { [key: string]: any } = {};

  constructor(private route: ActivatedRoute, private router: Router) {
    this.roomId = this.route.snapshot.paramMap.get("id")!;
  }

  ngOnInit(): void {
    this.socket = io(environment.socketUrl, {
      transports: ["polling"],
    });
    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id, this.socket.connected);

      this.myPeer = new Peer({
        host: environment.peerJsUrl,
        path: "/peerjs",
        secure: true,
      });

      this.myPeer.on("open", (id) => {
        this.socket.emit("join-room", this.roomId, id);
      });

      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: false,
        })
        .then((stream) => {
          this.myVideoStream = stream;
          this.localVideo.nativeElement.srcObject = stream;

          this.myPeer?.on("call", (call) => {
            call.answer(stream);
            call.on("stream", (userVideoStream) => {
              this.addRemoteStream(userVideoStream, call.peer);
            });
          });

          this.socket.on("user-joined", (userId: string) => {
            this.connectToNewUser(userId, stream);
          });

          this.socket.on("user-disconnected", (userId: string) => {
            if (this.peers[userId]) {
              this.peers[userId].close();
              this.removeRemoteStream(userId);
            }
          });
        });
    });
  }

  connectToNewUser(userId: string, stream: MediaStream): void {
    const call = this.myPeer?.call(userId, stream);
    call?.on("stream", (userVideoStream) => {
      this.addRemoteStream(userVideoStream, userId);
    });
    call?.on("close", () => {
      this.removeRemoteStream(userId);
    });
    this.peers[userId] = call;
  }

  addRemoteStream(stream: MediaStream, userId: string): void {
    const existingStream = this.remoteStreams.find((s) => s.id === stream.id);
    if (!existingStream) {
      this.remoteStreams.push(stream);
      this.updateRemoteVideos();
    }
  }

  removeRemoteStream(userId: string): void {
    delete this.peers[userId];
    this.remoteStreams = this.remoteStreams.filter((stream) => stream.id !== userId);
    this.updateRemoteVideos();
  }

  updateRemoteVideos(): void {
    this.remoteVideos.forEach((videoElement, index) => {
      if (this.remoteStreams[index]) {
        videoElement.nativeElement.srcObject = this.remoteStreams[index];
      } else {
        videoElement.nativeElement.srcObject = null;
      }
    });
  }

  toggleAudio(): void {
    this.audioEnabled = !this.audioEnabled;
    if (this.myVideoStream) {
      this.myVideoStream.getAudioTracks()[0].enabled = this.audioEnabled;
    }
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
    this.remoteStreams = [];

    // Clear the remote video elements
    this.updateRemoteVideos();

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
}
