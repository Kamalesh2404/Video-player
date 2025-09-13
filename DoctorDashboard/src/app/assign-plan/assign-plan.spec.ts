import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignPlan } from './assign-plan';

describe('AssignPlan', () => {
  let component: AssignPlan;
  let fixture: ComponentFixture<AssignPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignPlan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignPlan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
