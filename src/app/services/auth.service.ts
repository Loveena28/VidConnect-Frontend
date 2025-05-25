import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { AuthConfig, OAuthService } from "angular-oauth2-oidc";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class AuthService {

  constructor(private router: Router, private oAuthService: OAuthService) {
    this.initConfiguration();
  }

  initConfiguration() {
    const authConfig: AuthConfig = {
      issuer: "https://accounts.google.com",
      strictDiscoveryDocumentValidation: false,
      clientId: environment.clientID,
      redirectUri: window.location.origin + "/home",
      scope: "openid profile email",
    };
    this.oAuthService.configure(authConfig);
    this.oAuthService.setupAutomaticSilentRefresh();

    this.oAuthService.loadDiscoveryDocumentAndTryLogin();
  this.oAuthService.tryLogin({
    onTokenReceived: (context) => {
      // console.log("Claims after login:", context.idClaims);
    },
  });
  }

  login() {
    this.oAuthService.initImplicitFlow();
  }

  logout() {
    this.oAuthService.revokeTokenAndLogout();
    this.oAuthService.logOut();
    this.router.navigate(["/login"]);
  }

  get name() {
    const claims = this.oAuthService.getIdentityClaims();
    if (!claims) return null;
    return claims["name"];
  }

  getToken() {
    return this.oAuthService.getAccessToken();
  }

  getProfilePicture(): string {
    const claims = this.oAuthService.getIdentityClaims();
    if (!claims) return "";
    return claims["picture"] || "";
  }
}
