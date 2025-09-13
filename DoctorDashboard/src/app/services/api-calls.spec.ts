import { TestBed } from '@angular/core/testing';

import { ApiCalls } from './api-calls';

describe('ApiCalls', () => {
  let service: ApiCalls;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiCalls);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
