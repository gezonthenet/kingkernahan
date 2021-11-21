import { TestBed } from '@angular/core/testing';

import { StravaApiService } from './strava-api.service';

describe('StravaApiService', () => {
  let service: StravaApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StravaApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
