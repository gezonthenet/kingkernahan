import { Injectable } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, switchMap, switchMapTo, tap } from 'rxjs/operators';
import { merge, Observable, of } from 'rxjs';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class StravaApiService {

  clientSecret: string = "974d3539de3785cef7071d4ac8c5236377749b44";
  athlete: any = null;
  token: string = '';


  constructor(
    private http: HttpClient,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private location: Location
  ) { }

  //create a function to check for cookies
  checkStravaCookies(): Observable<any | undefined> {
    console.log('cookie:', document.cookie);
    if (document.cookie.includes('gezonthenet_strava_access_token')) {
      let expires_at = Number(document.cookie.split('gezonthenet_strava_expires_at=')[1].split(';')[0]);
      let refresh_token = document.cookie.split('gezonthenet_strava_refresh_token=')[1].split(';')[0];
      let current_time = new Date().getTime();
      if (expires_at*1000 < current_time) {
        console.log('the token has expired - refreshing now');
        return this.http.post('https://www.strava.com/oauth/token', {
          client_id: '42870',
          client_secret: this.clientSecret,
          refresh_token: refresh_token,
          grant_type: 'refresh_token'
        }).pipe(
          tap((result: any) => {  
            this.token = result.access_token;
            console.log(this.token);
            //set cookie gezonthenet_strava_access_token='1111' and gezonthenet_strava_refresh_token='2222' and gezonthenet_strava_expires_in='3333' and gezonthenet_strava_expires_at='4444'
            document.cookie = `gezonthenet_strava_access_token=${result.access_token}`;
            document.cookie = `gezonthenet_strava_refresh_token=${result.refresh_token}`;
            document.cookie = `gezonthenet_strava_expires_in=${result.expires_in}`;
            document.cookie = `gezonthenet_strava_expires_at=${result.expires_at}`;
            this.location.go('/');
          }),
          switchMap(() => { return this.executeStravaApiCall(this.getCurrentAthlete()).pipe(
            tap(data => this.athlete = data)
            ) 
          })
        );
      }  else {
        this.token = document.cookie.split('gezonthenet_strava_access_token=')[1].split(';')[0];
        console.log('we have a cookie', this.token);
        this.location.go('/');
        return this.executeStravaApiCall(this.getCurrentAthlete()).pipe(
          tap(data => this.athlete = data)
        );
      }
    } else if (/exchange_token/.test(this.router.url)) {
      //get router query parameters
      let params = this.activatedRoute.snapshot.queryParams;
      return this.http.post('https://www.strava.com/oauth/token', {
        client_id: '42870',
        client_secret: this.clientSecret,
        code: params.code,
        grant_type: 'authorization_code'
      }).pipe(
        tap((result: any) => {  
          this.token = result.access_token;
          //console.log(this.token);
          //set cookie gezonthenet_strava_access_token='1111' and gezonthenet_strava_refresh_token='2222' and gezonthenet_strava_expires_in='3333' and gezonthenet_strava_expires_at='4444'
          document.cookie = `gezonthenet_strava_access_token=${result.access_token}`;
          document.cookie = `gezonthenet_strava_refresh_token=${result.refresh_token}`;
          document.cookie = `gezonthenet_strava_expires_in=${result.expires_in}`;
          document.cookie = `gezonthenet_strava_expires_at=${result.expires_at}`;
          this.location.go('/');
        }),
        switchMap(() => { return this.executeStravaApiCall(this.getCurrentAthlete()).pipe(
          tap(data => this.athlete = data)
          )
        })
      );
    } else {
      this.reAuthenticate();
      return of(null);
    }
  }

  executeStravaApiCall(url: string, parameters?: any) {
    let params = new HttpParams();
    if (parameters) {
      Object.keys(parameters).forEach(key => {
        params = params.set(key, parameters[key]);
      });
    }
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`
    });
    return this.http.get(url, { 
      headers,
      params
   });
  }
 
  reAuthenticate() {
    let stravaOath = 'http://www.strava.com/oauth/authorize?client_id=42870&response_type=code&redirect_uri='+window.location.href+'exchange_token&approval_prompt=force&scope=activity:read';
    window.location.href = stravaOath;
  }

  //create a function that will return the strava api
  getStravaApi() {
    return 'https://www.strava.com/api/v3/';
  }

  //create a function that uses the strava api to get the current athlete
  getCurrentAthlete() {
    return this.getStravaApi() + 'athlete';
  }

  //create a function that uses the strava api to get the current athlete's stats
  getCurrentAthleteStats() {
    return this.getStravaApi() + 'athletes/' + this.athlete.id + '/stats';
  }

  //create a function that uses the strava api to get the current athlete's clubs
  getCurrentAthleteClubs() {
    return this.getStravaApi() + 'athletes/' + this.athlete.id + '/clubs';
  }

  //create a function that uses the strava api to get the current athlete's gear
  getCurrentAthleteGear() {
    return this.getStravaApi() + 'athletes/' + this.athlete.id + '/gear';
  }

  //create a function that uses the strava api to get the current athlete's followers
  getCurrentAthleteFollowers() {
    return this.getStravaApi() + 'athletes/' + this.athlete.id + '/followers';
  }

  //create a function that uses the strava api to get the current athlete's following
  getCurrentAthleteFollowing() {
    return this.getStravaApi() + 'athletes/' + this.athlete.id + '/following';
  }

  //create a function to get the current athletes koms
  getCurrentAthleteKoms() {
    return this.getStravaApi() + 'athletes/' + this.athlete.id + '/koms';
  }

  //create a function to get the current athletes activities
  getCurrentAthleteActivities() {
    return this.getStravaApi() + 'athletes/' + this.athlete.id + '/activities';
  }

}
