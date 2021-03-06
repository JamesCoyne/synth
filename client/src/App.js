import React, { Component } from "react";
import * as Tone from "tone";
import BackendExample from "./backendExample";
import { Piano, KeyboardShortcuts, MidiNumbers } from "react-piano";
import "react-piano/dist/styles.css";
import "./App.css";
import SequencerTable from "./seq_table";
import FileUploader from "file-uploader-js";
import Filter from "./Filter";
import "file-saver";
import {
  Navbar,
  Nav,
  Button,
  Container,
  Row,
  Col,
  Form,
  ButtonGroup,
  Modal,
} from "react-bootstrap";

class App extends Component {
  synth = new Tone.PolySynth(Tone.Synth).toMaster();

  // sequencer_row = [] as number[];
  sequencer_row = [];
  // sequencer_table = [] as Array<any>;
  sequencer_table = [];

  state = {
    shouldShowLogin: false,
    shouldShowRegister: false,
    shouldShowUpload: false,
    octave: 0,
    rows: 1, //how many rows of sequencer to display
    columns: 8, //how many cols of sequencer to display
    currentNote: "C4", //most recent notepress on keyboard, in Hz
    duration: 0.2,
    envelope: {
      attack: 0.5,
      decay: 0.5,
      sustain: 0.5,
      release: 0.5,
    },
    waveshape: "triangle",
    noteRange: {
      first: MidiNumbers.fromNote("c3"),
      last: MidiNumbers.fromNote("a4"),
    },
    //new sequencer stuff
    sequencer_cols: 16,
    sequencer_rows: 12,
    sequencer_table: new Array(16).fill(new Array(12).fill(true)),
    currUser: "",
    regUN: "",
    regPW: "",
    logUN: "",
    logPW: "",
  };

  keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: this.state.noteRange.first,
    lastNote: this.state.noteRange.last,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
  });

  saveState() {
    var FileSaver = require("file-saver");
    let state = JSON.stringify(this.state);
    var blob = new Blob([state], { type: "text/plain;charset=utf-8" });
    FileSaver.saveAs(blob, "state.json");
  }

  loadState = (file) => {
    this.setState(JSON.parse(file));
    this.setState({ state: this.state });
    //this.forceUpdate();
  };

  componentDidUpdate(props) {
    // set the synthesizer's envelope everytime a slider is changed
    this.synth.set({
      envelope: this.state.envelope,
      oscillator: { type: this.state.waveshape },
    });
  }

  play = (freq) => {
    this.synth.triggerAttack(freq);
  };

  playNode = (midiNote) => {
    console.log(this.state.octave);
    midiNote = 0.0 + midiNote;
    console.log("midiNote: " + midiNote);
    let freq = Math.pow(2.0, (midiNote - 69.0) / 12.0) * 440.0;
    //applying octave to freq
    if (this.state.octave > 0) {
      for (let i = 0; i < this.state.octave; i++) {
        freq = freq * 2;
      }
    } else if (this.state.octave < 0) {
      for (let i = 0; i > this.state.octave; i--) {
        freq = freq / 2;
      }
    }
    console.log("frequency:" + freq);
    this.setState({ currentNote: freq });
    this.play(freq);
  };

  stopNote = (midiNote) => {
    console.log("note stopped");
    midiNote = 0.0 + midiNote;
    console.log("midiNote: " + midiNote);
    let freq = Math.pow(2.0, (midiNote - 69.0) / 12.0) * 440.0;
    //applying octave to freq
    if (this.state.octave > 0) {
      for (let i = 0; i < this.state.octave; i++) {
        freq = freq * 2;
      }
    } else if (this.state.octave < 0) {
      for (let i = 0; i > this.state.octave; i--) {
        freq = freq / 2;
      }
    }
    //console.log('frequency:' + freq);
    //this.setState({currentNote: freq});
    this.synth.triggerRelease(freq);
  };

  //todo : remove hard code, attach these methods to instrument save/load button as well as register/login
  //saves instrument preset
  saveInstrument = async () => {
    const response = await fetch("/api/saveinst", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: "janesmith",
        name: "my_instrument",
        inst: JSON.stringify({
          octave: this.state.octave,
          oscillator: this.synth.get().oscillator,
          envelope: this.synth.get().envelope,
        }),
      }),
    });
    const body = await response.text();
    console.log(body);
  };

  //load instrument preset
  loadInstrument = async (inst_name) => {
    const response = await fetch("/api/loadinst", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: this.state.currUser,
        preset_name: "my_instrument",
      }),
    });
    const body = JSON.parse(await response.text());
    this.setState({ octave: body.octave });
    this.setState({ waveshape: body.oscillator.type });
    this.setState({ envelope: body.envelope });
    this.synth.set(body.oscillator);
    this.synth.set(body.envelope);
    //reflect change in the sliders somehow

    console.log("Instrument loaded!");
  };

  //create user
  register = async () => {
    var newUsername = this.state.regUN;
    var newPassword = this.state.regPW;
    const response = await fetch("/api/createuser", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        un: newUsername,
        pw: newPassword,
      }),
    });
    const body = await response.text();
    switch (body) {
      case "Username taken!": {
        //do something with UI
        break;
      }
      case "User successfully created!": {
        this.setState({ currUser: newUsername });
        break;
      }
    }
    console.log(body);
  };

  //log in as user
  login = async () => {
    var logUsername = this.state.logUN;
    var logPassword = this.state.logPW;
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        un: logUsername,
        pw: logPassword,
      }),
    });
    const body = await response.text();
    switch (body) {
      case "Login successful!": {
        this.setState({ currUser: logUsername });
        console.log(body);
        break;
      }
      case "Password incorrect!": {
        //do something with the login UI
        break;
      }
      case "User does not exist": {
        //do something with the login UI
        break;
      }
    }
    this.toggleLoginModal();
    alert("Login successful!");
  };

  //callback function for maintaining the state here to pass to SequencerTable component
  // updateSeqTable(colIdx: number, col: Array<boolean>) {
  //   console.log(
  //     "Column updated: " + colIdx + "\nNew values: " + col.toString()
  //   );
  // }

  // updateSeqTable(colIdx: number, col: Array<boolean>) {
  updateSeqTable(colIdx, col) {
    console.log(
      "Column updated: " + colIdx + "\nNew values: " + col.toString()
    );
  }

  toggleUploadModal() {
    const { shouldShowUpload } = this.state;
    this.setState({ shouldShowUpload: !shouldShowUpload });
  }

  toggleLoginModal() {
    const { shouldShowLogin } = this.state;
    this.setState({ shouldShowLogin: !shouldShowLogin });
  }

  toggleRegisterModal() {
    const { shouldShowRegister } = this.state;
    this.setState({ shouldShowRegister: !shouldShowRegister });
  }

  testDB = async () => {
    //url to grab from
    //test user creation
    const createresponse = await fetch("/api/createuser", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        un: "newUsername",
        pw: "newPassword",
      }),
    });
    const createbody = await createresponse.text();
    console.log(createbody);

    //test user login
    const loginresponse = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        un: "janesmith",
        pw: "12345",
      }),
    });
    const loginbody = await loginresponse.text();
    console.log(loginbody);

    //test sequence save
    //not really doable without the client running
    //already done

    //test sequence load
    const seqloadresponse = await fetch("/api/tbload", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: "janesmith",
        seq_name: "my_sequence",
      }),
    });
    const seqloadbody = await seqloadresponse.json();
    if (seqloadbody.length === 16) {
      console.log("Sequence loaded!");
    } else {
      console.log("Sequence failed to load!");
    }

    //test sequence list get
    const seqlistresponse = await fetch("/api/getseqlist", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: "janesmith",
      }),
    });
    const seqlistbody = await seqlistresponse.json();
    console.log(seqlistbody);
    if (seqlistbody.includes("my_sequence")) {
      console.log("Got sequence list!");
    } else {
      console.log("Couldnt get sequence list!");
    }

    //test inst preset save
    //not really doable without the client running
    //also already done

    //test inst preset load
    const instloadresponse = await fetch("/api/loadinst", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: "janesmith",
        preset_name: "my_instrument",
      }),
    });
    const instloadbody = JSON.parse(await instloadresponse.text());
    if (instloadbody.oscillator.type === "triangle") {
      console.log("Instrument loaded!");
    } else {
      console.log("Instrument failed to load!");
    }

    //test inst preset list get
    const instlistresponse = await fetch("/api/getinstlist", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: "janesmith",
      }),
    });
    const instlistbody = await instlistresponse.json();
    console.log(instlistbody);
    if (instlistbody.includes("my_instrument")) {
      console.log("Got instrument list!");
    } else {
      console.log("Couldnt get instrument list!");
    }
    //all tests successful
    console.log("All tests completed!");
  };

  render() {
    const {
      shouldShowLogin,
      shouldShowRegister,
      shouldShowUpload,
    } = this.state;
    return (
      <div className="App">
        <Navbar bg="dark" variant="dark">
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="container-fluid">
              <Nav.Link onClick={this.saveState.bind(this)}>Download</Nav.Link>
              <Nav.Link onClick={this.toggleUploadModal.bind(this)}>
                Load
              </Nav.Link>
              <Nav.Item className="ml-auto">
                <Button onClick={this.toggleLoginModal.bind(this)}>
                  Log In
                </Button>
                <Button onClick={this.toggleRegisterModal.bind(this)}>
                  Register
                </Button>
              </Nav.Item>
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        <Modal
          show={shouldShowUpload}
          onHide={this.toggleUploadModal.bind(this)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Load</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <FileUploader
              accept=".json"
              title="Load State"
              uploadedFileCallback={(e) => {
                this.loadState.bind(this)(e);
              }}
            />
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={this.toggleRegisterModal.bind(this)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              onClick={this.register.bind(this)}
            >
              Load
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={shouldShowRegister}
          onHide={this.toggleRegisterModal.bind(this)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Register</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form>
              <Form.Group controlId="username">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="username"
                  placeholder="username"
                  onChange={(e) => {
                    this.setState({ regUN: e.target.value });
                  }}
                />
              </Form.Group>
            </Form>
            <Form>
              <Form.Group controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="password"
                  onChange={(e) => {
                    this.setState({ regPW: e.target.value });
                  }}
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={this.toggleRegisterModal.bind(this)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              onClick={this.register.bind(this)}
            >
              Register
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={shouldShowLogin} onHide={this.toggleLoginModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Log in</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form>
              <Form.Group controlId="username">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="username"
                  placeholder="username"
                  onChange={(e) => {
                    this.setState({ logUN: e.target.value });
                  }}
                />
              </Form.Group>
            </Form>
            <Form>
              <Form.Group controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="password"
                  onChange={(e) => {
                    this.setState({ logPW: e.target.value });
                  }}
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={this.toggleLoginModal.bind(this)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              onClick={this.login.bind(this)}
            >
              Log in
            </Button>
          </Modal.Footer>
        </Modal>

        <Container fluid>
          <Row>
            <Col style={{ borderRight: "1px solid white", height: "92vh" }}>
              Synthesizer
              <Row>
                <Col>
                  <Form>
                    <Form.Group controlId="">
                      <ButtonGroup aria-label="Basic example">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            this.setState({ waveshape: "square" });
                          }}
                        >
                          Square
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            this.setState({ waveshape: "sine" });
                          }}
                        >
                          Sin
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            this.setState({ waveshape: "sawtooth" });
                          }}
                        >
                          Saw
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            this.setState({ waveshape: "triangle" });
                          }}
                        >
                          Triangle
                        </Button>
                      </ButtonGroup>
                    </Form.Group>

                    <Form.Group controlId="formBasicRange">
                      <Form.Label>Octave</Form.Label>
                      <Form.Control
                        type="range"
                        min={-2}
                        max={2}
                        step={1}
                        defaultValue={this.state.octave}
                        onChange={(event) => {
                          this.setState({
                            octave: parseFloat(event.target.value),
                          });
                        }}
                      />
                    </Form.Group>

                    <Form.Group controlId="formBasicRange">
                      <Form.Label>Duration (s)</Form.Label>
                      <Form.Control
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.1}
                        defaultValue={this.state.duration}
                        onChange={(event) => {
                          this.setState({
                            duration: parseFloat(event.target.value),
                          });
                        }}
                      />
                    </Form.Group>
                  </Form>
                </Col>
                <Col>
                  <Row>
                    <Filter />
                  </Row>
                  <Row>
                    Envelope
                    <Form>
                      <Form.Label>Attack</Form.Label>
                      <Form.Control
                        type="range"
                        min={0.1}
                        max={2}
                        step={0.1}
                        defaultValue={this.state.envelope.attack}
                        onChange={(event) => {
                          this.setState({
                            envelope: {
                              attack: parseFloat(event.target.value),
                            },
                          });
                        }}
                      />
                      <Form.Label>Decay</Form.Label>
                      <Form.Control
                        type="range"
                        min={0.1}
                        max={2}
                        step={0.1}
                        defaultValue={this.state.envelope.decay}
                        onChange={(event) => {
                          this.setState({
                            envelope: {
                              decay: parseFloat(event.target.value),
                            },
                          });
                        }}
                      />
                      <Form.Label>Sustain</Form.Label>
                      <Form.Control
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.1}
                        defaultValue={this.state.envelope.sustain}
                        onChange={(event) => {
                          this.setState({
                            envelope: {
                              sustain: parseFloat(event.target.value),
                            },
                          });
                        }}
                      />
                      <Form.Label>Release</Form.Label>
                      <Form.Control
                        type="range"
                        min={0.1}
                        max={2}
                        step={0.1}
                        defaultValue={this.state.envelope.release}
                        onChange={(event) => {
                          this.setState({
                            envelope: {
                              release: parseFloat(event.target.value),
                            },
                          });
                        }}
                      />
                    </Form>
                  </Row>
                </Col>
              </Row>
            </Col>
            <Col>
              Sequencer
              <Row>
                <SequencerTable
                  len={this.state.sequencer_cols}
                  actualTable={this.sequencer_table}
                  callback={this.updateSeqTable}
                  octave={this.state.octave}
                  envelope={this.state.envelope}
                  waveshape={this.synth.get().oscillator}
                  currUser={this.state.currUser}
                  instload={this.loadInstrument}
                />
              </Row>
              <Row
                style={{
                  height: "200px",
                  marginTop: "20px",
                }}
              >
                <Piano
                  noteRange={this.state.noteRange}
                  playNote={this.playNode}
                  stopNote={this.stopNote}
                  disabled={false}
                  keyboardShortcuts={this.keyboardShortcuts}
                  style={{ height: "100px" }}
                />
              </Row>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

export default App;
