import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserEventsService {

  private joinLeaveMessageSource = new Subject<string>();
  joinLeaveMessages$ = this.joinLeaveMessageSource.asObservable();

  notify(message: string) {
    this.joinLeaveMessageSource.next(message);
  }
}
