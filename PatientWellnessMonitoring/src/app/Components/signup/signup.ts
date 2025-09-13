import { Component, inject } from '@angular/core';
import {
  FormsModule,
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Authentication } from '../../Services/authentication';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, HttpClientModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  selectedForm: string = 'form1';

  userService = inject(Authentication);

  constructor(private router: Router) {}

  doctorSignUpForm = new FormGroup({
    fname: new FormControl('', [Validators.required, Validators.pattern(/^[A-Za-z]+$/)]),
    lname: new FormControl('', [Validators.pattern(/^[A-Za-z]+$/)]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  patientSignUpForm = new FormGroup({
    fname: new FormControl('', [Validators.required, Validators.pattern(/^[A-Za-z]+$/)]),
    lname: new FormControl('', [Validators.pattern(/^[A-Za-z]+$/)]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  msg = '';

  onDoctorSubmit() {
    const newDoctor = this.doctorSignUpForm.value;
    this.userService.getDoctors().subscribe((users) => {
      const msg = users.some((user: any) => user.phone === newDoctor.phone);

      if (msg) {
        this.msg = 'Doctor already exists!';
      } else {
        this.userService.addDoctor(newDoctor).subscribe(() => {
          this.msg = 'Doctor registered successfully!';
          this.doctorSignUpForm.reset();
        });
      }
    });
  }

  onPatientSubmit() {
    const newPatient = this.patientSignUpForm.value;
    this.userService.getPatients().subscribe((users) => {
      const msg = users.some((user: any) => user.phone === newPatient.phone);

      if (msg) {
        this.msg = 'Patient already exists!';
      } else {
        this.userService.addPatient(newPatient).subscribe(() => {
          this.msg = 'Patient registered successfully!';
          this.patientSignUpForm.reset();
        });
      }
    });
  }

  toLogInPage() {
    this.router.navigate(['login']);
  }
}
