import { Component, OnInit } from '@angular/core';
import { StravaApiService } from './strava-api.service';
import { Router, NavigationEnd } from '@angular/router';
import { first, filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit{
  title = 'strava-auditor';
  koms: any = [];
  name: string = '';
  data: any = [];
  options: any = {};
  fetchingKoms: boolean =  true;

  constructor(
    private stravaApiService: StravaApiService,
    private router: Router
  ) { }

  ngOnInit() {

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      first()
    ).subscribe(() => {
      this.stravaApiService.checkStravaCookies()?.subscribe({
        next: (data) => {
          console.log('login data', data);
          this.name = data.firstname;
          this.fetchKoms(1, 100);

          //this.stravaApiService.executeStravaApiCall(this.stravaApiService.getCurrentAthleteStats()).subscribe((result) => {
          //  console.log('Stats', result);
          //});

          //this.stravaApiService.executeStravaApiCall(this.stravaApiService.getCurrentAthleteActivities(), {
          //  page: 1,
          //  per_page:150
          //}).subscribe((result) => {
          //  console.log('Activities', result);
          //});
        },
        error: (err: any) => {
          console.log('login error', err);
          this.stravaApiService.reAuthenticate();
          return err;
        }
      });

    });

  }

  /**
   * Fetch KOMS for an athlete page by page
   * 
   * @param p page number
   * @param pp per page
   */
  fetchKoms(p: number, pp: number) {
    this.stravaApiService.executeStravaApiCall(this.stravaApiService.getCurrentAthleteKoms(), {
      page: p,
      per_page: pp
    }).subscribe((result: any) => {
      console.log('KOMS page', p, result);
      this.koms = this.koms.concat(result);
      if (result.length === pp) {
        this.fetchKoms(p+1, pp);
      } else {
        this.data = this.koms.map((kom:any, index: number) => ({
          ID: index+1,
          NAME: kom.name,
          DATE: this.parseDate(kom.start_date),
          DISTANCE: (kom.distance / 1000).toFixed(2)+' km',
          TIME: this.timeHoursMinutesAndSeconds(kom.moving_time),
          PACE: this.paceMinutesAndSecondsPerKm(kom.moving_time, kom.distance),
          LINK: 'strava.com/segments/'+kom.segment.id
        }));
        this.options = {
          filename: this.name+'_koms',
          showLabels: false,
          title: 'KOMS',
          fieldSeparator: ',',
          quoteStrings: '"',
          decimalseparator: '.',
          headers: ['ID', 'NAME', 'DATE', 'DISTANCE', 'TIME', 'PACE', 'LINK'],
          showTitle: false,
          useBom: false,
          removeNewLines: false,
          keys: []
        };
        this.fetchingKoms = false;
      }
    });
  }

  parseDate(date: string) {
    let d = new Date(date)
    return d.toDateString()+',  '+d.toLocaleTimeString();
  }

  //pace in minutes per km
  paceMinutesAndSecondsPerKm(time: number, distance: number) {
    let pace = time / (distance / 1000);
    return this.timeMinutesAndSeconds(pace);
  }

  //fractions of a minute to rounded seconds
  timeFractions(time: number) {
    let timeFractions = time % 60;
    return Math.round(timeFractions);
  }

  //time in minutes and seconds
  timeMinutesAndSeconds(time: number) {
    let minutes = Math.floor(time / 60);
    let seconds = Math.round(time - minutes * 60);
    return minutes +':'+ (seconds < 10 ? '0'+seconds : seconds);
  }

  //time in hours and minutes
  timeHoursAndMinutes(time: number) {
    let hours = Math.floor(time / 60);
    let minutes = Math.round(time - hours * 60);
    return hours +':'+ (minutes < 10 ? '0'+minutes : minutes);
  }

  //time in minutes and seconds
  timeHoursMinutesAndSeconds(time: number) {
    let minutes = Math.floor(time / 60);
    let seconds = Math.round(time - minutes * 60);
    return this.timeHoursAndMinutes(minutes) +':'+ (seconds < 10 ? '0'+seconds : seconds);
  }

}
