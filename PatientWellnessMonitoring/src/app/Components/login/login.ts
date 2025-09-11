import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, HttpClientModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  selectedForm: string = 'Form1';
  msg = '';
  constructor(private http: HttpClient, private router: Router) {}

  goToSignUp() {
    this.router.navigate(['signup']);
  }

  // loginForm = new FormGroup({
  //   phone: new FormControl('', [Validators.minLength(10), Validators.required, Validators.maxLength(10)]),
  //   password: new FormControl('', [Validators.required])
  // });

  doctorLoginForm = new FormGroup({
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
    password: new FormControl('', [Validators.required]),
  });

  patientLoginForm = new FormGroup({
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
    password: new FormControl('', [Validators.required]),
  });

  onDoctorSubmit() {
    const { phone, password } = this.doctorLoginForm.value;

    this.http.get<any[]>('http://localhost:3000/doctors').subscribe((users) => {
      const user = users.find((u) => u.phone === phone || u.password === password);

      if (user) {
        this.msg = 'Login successful!';
        setTimeout(() => {
          this.router.navigate(['dashboard']);
        }, 500);
      } else {
        this.msg = 'Invalid phone number or password!';
      }
    });
  }

  onPatientSubmit() {
    const { phone, password } = this.patientLoginForm.value;

    this.http.get<any[]>('http://localhost:3000/patients').subscribe((users) => {
      const user = users.find((u) => u.phone === phone || u.password === password);

      if (user) {
        this.msg = 'Login successful!';
        setTimeout(() => {
          this.router.navigate(['dashboard']);
        }, 500);
      } else {
        this.msg = 'Invalid phone number or password!';
      }
    });
  }
}
