import { Component, OnInit } from '@angular/core';
import { StravaApiService } from './strava-api.service';
import { Router, NavigationEnd } from '@angular/router';
import { first, filter } from 'rxjs/operators';
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit{
  title = 'strava-auditor';
  koms: any = [];
  name: string = '';
  athleteId: string = '';
  data: any = [];
  options: any = {};
  fetchingKoms: boolean =  true;
  diffSummary: any = [];
  objectKeys: any = Object.keys;
  changeTypeText: any = {
    added: 'new',
    deleted: 'lost',
    updated: 'improved'
  };
  changeDetectionText: string = '';

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
          this.athleteId = data.id.toString();
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
          DISTANCE: this.metersToKm(kom.distance),
          TIME: this.timeHoursMinutesAndSeconds(kom.elapsed_time),
          PACE: this.paceMinutesAndSecondsPerKm(kom.elapsed_time, kom.distance),
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

        /*
        //remove the 13th element from this.koms
        this.koms.splice(12, 1);
        this.koms[1].elapsed_time = 28;
        //this.koms.splice(22, 1);
        */
        this.auditLocalStorage();
      }
    });
  }

  /**
   * check if this item is the same as the most recent local storage item
   * if not, save it as a new item
   */
  auditLocalStorage() {
    //filter an array to only keep values matching a string
    let availableSnapshots = this.getAvailableSnapshots();
    console.log('available snapshots', availableSnapshots);
    if (availableSnapshots.length > 0) {
      let lastSnapshot = availableSnapshots[availableSnapshots.length-1];
      let lastSnapshotData = this.attemptToGetSnapshot(lastSnapshot);
      //console.log('last snapshot', lastSnapshot, lastSnapshotData);
      let previousSegmentIds = this.getSegmentIds(lastSnapshotData);
      let currentSegmentIds = this.getSegmentIds(this.koms);
      let diffs: any = detailedDiff(previousSegmentIds, currentSegmentIds);
      if (Object.keys(diffs.added).length > 0 || Object.keys(diffs.deleted).length > 0 || Object.keys(diffs.updated).length > 0) {
        console.log('changes between this and the last snapshot', diffs);
        console.log();
        this.saveToLocalStorage();
        this.changeDetectionText = 'Changes detected since last snapshot!';
      } else {
        this.changeDetectionText = 'No changes detected since most recent snapshot on '+this.extractDateFromSnapshotName(lastSnapshot);
        console.log('no changes between this and the last snapshot - not saving to local storage');
      }
    } else {
      this.changeDetectionText = 'First snapshot saved to local browser storage.';
      console.log('no previous snapshots');
      this.saveToLocalStorage();
    }
    this.generateChangeSummary();
  }

  attemptToGetSnapshot(snapshotName: string) {
    try {
      return JSON.parse(localStorage.getItem(snapshotName) || '');
    } catch (e) {
      console.log('error parsing snapshot', snapshotName, e);
    }
  }

  generateChangeSummary() {
    let availableSnapshots = this.getAvailableSnapshots().reverse();
    //if there are 2 or more snapshots loop through them and compare the last snapshot to the snapshot before that
    if (availableSnapshots.length > 1) {
      for (let i = 0; i < availableSnapshots.length-1 || (i < 20 && availableSnapshots.length > 20); i++) {
        console.log('comparing', i, 'and', i+1, availableSnapshots[i], availableSnapshots[i+1]);
        let currentSnapshot = availableSnapshots[i];
        let currentSnapshotData = this.attemptToGetSnapshot(currentSnapshot);
        let currentSegmentIds = this.getSegmentIds(currentSnapshotData);
        let previousSnapshot = availableSnapshots[i+1];
        let previousSnapshotData = this.attemptToGetSnapshot(previousSnapshot);
        let previousSegmentIds = this.getSegmentIds(previousSnapshotData);
        let diffs: any = detailedDiff(previousSegmentIds, currentSegmentIds);
        let changesToSave: boolean = false;


        if (Object.keys(diffs.added).length > 0 || Object.keys(diffs.deleted).length > 0 || Object.keys(diffs.updated).length > 0) {
          console.log('changes between snapshots', currentSnapshot, previousSnapshot, diffs);
          let deletedSegments = Object.keys(diffs.deleted);
          let addedSegments = Object.keys(diffs.added);
          let updatedSegments = Object.keys(diffs.updated);
          deletedSegments.forEach(segmentId => {
            //must come from previous snapshot
            diffs.deleted[segmentId] = this.retrieveSegmentData(Number(segmentId), previousSnapshotData);
          });
          addedSegments.forEach(segmentId => {
            //must come from previous snapshot
            diffs.added[segmentId] = this.retrieveSegmentData(Number(segmentId), currentSnapshotData);
          });
          updatedSegments.forEach(segmentId => {
            //must come from previous snapshot
            diffs.updated[segmentId] = this.retrieveSegmentData(Number(segmentId), currentSnapshotData);
            let previousSegment = this.retrieveSegmentData(Number(segmentId), previousSnapshotData);
            diffs.updated[segmentId].previousTime = previousSegment.elapsed_time;
          });
          changesToSave = true;
        }

        //we need to check if the pace bewteen any segmans as change (i.e. improved time)

        if (changesToSave) {
          this.diffSummary.push({
            currentSnapshot: currentSnapshot,
            previousSnapshot: previousSnapshot,
            diffs: diffs
          });

        } else {
          console.log('no changes between snapshots', currentSnapshot, previousSnapshot);
        }
      }
      console.log('this.diffSummary', this.diffSummary);
    }
  }

  getAvailableSnapshots() {
    return Object.keys(localStorage).filter((item:any) => {
      return /^\d+_koms_\d+$/.test(item);
    }).sort();
  }

  saveToLocalStorage() {
    let currentTime = new Date().getTime();
    let storageName = currentTime.toString()+'_koms_'+this.athleteId;
    console.log('saving to local storage', storageName);
    localStorage.setItem(storageName, JSON.stringify(this.koms));
  }

  getSegmentIds(koms: any) {
    return this.getObjectFromArray(koms.map((kom:any) => ({ id: kom.segment.id, time: kom.elapsed_time})));
      
  }

  //turn and array into an ojects of element => true
  getObjectFromArray(array: any) {
    let obj: any = {};
    array.forEach((item: any) => {
      obj[item.id] = item.time;
    });
    return obj;
  }

  retrieveSegmentData(segmentId: number, snapshotData: any) {
    let segment = snapshotData.find((segment:any) => segment.segment.id === segmentId);
    return segment;
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
    let minutes = time > 0 ? Math.floor(time / 60) : Math.ceil(time / 60);
    let seconds = Math.abs(Math.round(time - minutes * 60));
    return (time < 0 ? '-' : '') + minutes +':'+ (seconds < 10 ? '0'+seconds : seconds);
  }

  //time in hours and minutes
  timeHoursAndMinutes(time: number) {
    let hours = Math.floor(time / 60);
    let minutes = Math.round(time - hours * 60);
    return hours +':'+ (minutes < 10 ? '0'+minutes : minutes);
  }

  //time in minutes and seconds
  timeHoursMinutesAndSeconds(time: number) {
    let minutes = time > 0 ? Math.floor(time / 60) : Math.ceil(time / 60);
    let seconds = Math.abs(Math.round(time - minutes * 60));
    return (time < 0 ? '-' : '') + this.timeHoursAndMinutes(minutes) +':'+ (seconds < 10 ? '0'+seconds : seconds);
  }

  extractDateFromSnapshotName(snapshotName: string) {
    let d = new Date(Number(snapshotName.split('_')[0]));
    return d.toDateString()+',  '+d.toLocaleTimeString();
  }

  metersToKm(meters: number) {
    return (meters / 1000).toFixed(2)+' km';
  }

}