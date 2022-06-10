import { Container, TextField, Stack, Button, Grid, Snackbar, Typography, Divider, useMediaQuery } from '@mui/material'
import { useEffect, useState, } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getCookie } from '../lib/cookie'
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Box, FormControl, InputLabel, Select, MenuItem, FormGroup, Checkbox } from '@mui/material'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Patient } from '../lib/fhir/resources'
import { v4 as uuidv4 } from 'uuid';
import { FhirApi } from './../lib/api'
import * as qs from 'query-string';
import { DataGrid } from '@mui/x-data-grid';
import counties from '../data/counties.json'
import consituencyToWard from '../data/consituencies_to_ward.json'
import consituencies from '../data/constituencies.json'
import wards from '../data/wards.json'
import { startVisit } from '../lib/startVisit'
import { CreateObservation } from '../lib/fhir/Observation'
import observationCodes from '../lib/fhir/observationCodes.json'
import { parse } from '../lib/fhir/parser'
import { CreateEncounter } from '../lib/fhir/Encounter'

export default function MaternityUnit({ id }) {




    let [patient, setPatient] = useState({})
    let [open, setOpen] = useState(false)
    let [data, setData] = useState({})
    let [message, setMessage] = useState(false)
    let [selectedCounty, setCounty] = useState('')
    let [selectedConsituency, setConstituency] = useState('')
    let [patients, setPatients] = useState({})
    let [selectionModel, setSelectionModel] = useState([]);
    let navigate = useNavigate()
    let isMobile = useMediaQuery('(max-width:600px)');
    let args = qs.parse(window.location.search);
    const [value, setValue] = useState('1');

    const columns = [
        { field: 'id', headerName: 'Patient ID', width: 150, },
        { field: 'lastName', headerName: 'Last Name', width: 200, editable: true },
        { field: 'firstName', headerName: 'First Name', width: 200, editable: true },
        { field: 'age', headerName: 'Age', width: 200 },
    ];


    let getPatients = async () => {

        let data = await FhirApi({ url: '/fhir/Patient', method: 'GET' })
        let p = data.data.entry.map((i) => {
            let r = i.resource
            return {
                id: r.id, lastName: r.name[0].family, firstName: r.name[0].given[0],
                age: `${(Math.floor((new Date() - new Date(r.birthDate).getTime()) / 3.15576e+10))} years`
            }
        })
        setPatients(p)
    }

    let deletePatient = async () => {

    }

    useEffect(() => {
        let _edd = new Date(patient.lmp ? patient.lmp : new Date())
        _edd.setDate(_edd.getDate() + (36 * 7))
        console.log(_edd)
        setPatient({ ...patient, edd: _edd.toISOString().substring(0, 10) })

    }, [patient.lmp])

    useEffect(() => {
        getPatients()
    }, [])

    useEffect(() => {
        if (getCookie("token")) {
            return
        } else {
            navigate('/login')
            window.localStorage.setItem("next_page", "/patient-registration")
            return
        }
    }, [])





    const handleChange = (event, newValue) => {
        setValue(newValue);
    };


    let registerPatient = async () => {
        try {
            let id = uuidv4()
            let encounterId = uuidv4()
            // let response = await FhirApi({ url: `/fhir/Patient`, method: 'POST', data: JSON.stringify(Patient({...patient}))})

            let response = await FhirApi({ url: `/fhir/Patient/${id}`, method: 'PUT', data: JSON.stringify(Patient({ ...patient, id: id })) })
            console.log(response)
            if (response.status === "success") {
                setOpen(false)
                setMessage("Patient created successfully")
                setOpen(true)
            }


            //Create Encounter
            let encounter = await FhirApi({
                url: `/fhir/Encounter/${encounterId}`, method: 'PUT',
                data: JSON.stringify(CreateEncounter(id, encounterId))
            })

            //Create and Post Observations
            let observations = ["bodyWeight", "bodyHeight", "gravida", "parity", "lmp", "edd"]
            for (let o of observations) {
                let p = String(observationCodes[o]).split(":")
                console.log(p)
                let observationId = uuidv4()
                let observation = CreateObservation(
                    { system: p[0], code: p[1], display: p[2] }, id,
                    { value: patient[o] },
                    observationId, encounterId)
                console.log(observation)
                // let response = await FhirApi({ url: `/fhir/Observation/${observationId}`, method: 'PUT', data: JSON.stringify(observation) })
                // console.log(response)
                // if (response.status === "success") {
                //     setOpen(false)
                //     setMessage("Patient created successfully")
                //     setOpen(true)
                // }
            }
            navigate(`/patients/${id}`)
            return
        } catch (error) {
            setOpen(true)
            console.log(error)
            setMessage(String(error))
            return
        }
    }

    useEffect(() => {
        if (getCookie("token")) {
            return
        } else {
            navigate('/login')
            window.localStorage.setItem("next_page", "/patient-registration")
            return
        }
    }, [])






    return (
        <>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Layout>

                    <Container sx={{ border: '1px white dashed' }}>
                        <Snackbar
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                            open={open}
                            onClose={""}
                            message={message}
                            key={"loginAlert"}
                        />
                        <TabContext value={value}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <TabList
                                    value={value}
                                    onChange={handleChange}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    aria-label="scrollable auto tabs example">
                                    <Tab label="Maternal Profile" value="1" />
                                    <Tab label="Registered Patients" value="2" />
                                    {/* <Tab label="Reports" value="3" /> */}
                                </TabList>
                            </Box>
                            <TabPanel value='1'>
                                {/* <p></p> */}

                                <Grid container spacing={1} padding=".5em" >
                                    <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            label="First Name"
                                            placeholder="First Name"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, firstName: e.target.value }) }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            label="Last Name"
                                            placeholder="Last Name"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, lastName: e.target.value }) }}
                                        // onChange={e=>{console.log(e)}}

                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            label="Other Names"
                                            placeholder="Other Names"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, otherNames: e.target.value }) }}
                                        // onChange={e=>{console.log(e)}}

                                        />
                                    </Grid>
                                </Grid>
                                <Grid container spacing={1} padding=".5em" >
                                    <Grid item xs={12} md={12} lg={4}>
                                        {!isMobile ? <DesktopDatePicker
                                            label="Date of birth"
                                            inputFormat="yyyy-MM-dd"
                                            value={patient.dob}
                                            onChange={e => { console.log(e); setPatient({ ...patient, dob: e }) }}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        /> :
                                            <MobileDatePicker
                                                label="Date of birth"
                                                inputFormat="yyyy-MM-dd"
                                                value={patient.dob}
                                                onChange={e => { console.log(e); setPatient({ ...patient, dob: e }) }}
                                                renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                            />}
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={2}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            label="Gravida"
                                            placeholder="Gravida"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, gravida: e.target.value }) }}
                                        // onChange={e=>{console.log(e)}}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={2}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            label="Parity"
                                            placeholder="Parity"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, parity: e.target.value }) }}
                                        // onChange={e=>{console.log(e)}}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={2}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            label="Height(cm)"
                                            placeholder="Height(cm)"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, bodyHeight: e.target.value }) }}
                                        // onChange={e=>{console.log(e)}}

                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={2}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            label="Weight (kg)"
                                            placeholder="Weight (kg)"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, bodyWeight: e.target.value }) }}
                                        // onChange={e=>{console.log(e)}}
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={12} lg={4}>
                                        {!isMobile ? <DesktopDatePicker
                                            label="LMP"
                                            inputFormat="yyyy-MM-dd"
                                            value={patient.lmp}
                                            onChange={e => { console.log(e); setPatient({ ...patient, lmp: e }) }}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        /> :
                                            <MobileDatePicker
                                                label="LMP"
                                                inputFormat="yyyy-MM-dd"
                                                value={patient.lmp}
                                                onChange={e => { console.log(e); setPatient({ ...patient, lmp: e }) }}
                                                renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                            />}
                                    </Grid>
                                    {patient.edd && <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="80%"
                                            type="text"
                                            value={patient.edd ? patient.edd : null}
                                            label="EDD"
                                            placeholder="EDD"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, edd: e.target.value }) }}
                                        // onChange={e=>{console.log(e)}}
                                        />
                                    </Grid>}
                                </Grid>
                                <Grid container spacing={1} padding=".5em" >
                                    <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="100%"
                                            type="text"
                                            label="Address"
                                            placeholder="Address"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, address: e.target.value }) }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="100%"
                                            type="phone"
                                            label="Phone Number"
                                            placeholder="Phone Number"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, patientPhoneNumber: e.target.value }) }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={4}>
                                        <FormControl fullWidth>
                                            <InputLabel id="demo-simple-select-label">Education Level</InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={patient.educationLevel ? patient.educationLevel : null}
                                                label="Education Level"
                                                onChange={e => { setPatient({ ...patient, educationLevel: e.target.value }) }}
                                                size="small"
                                                defaultValue={"Primary School"}
                                            >
                                                <MenuItem value={"Primary School"}>Primary School</MenuItem>
                                                <MenuItem value={"High School"}>High School</MenuItem>
                                                <MenuItem value={"Undergraduate"}>Undergraduate</MenuItem>
                                                <MenuItem value={"Postgraduate"}>Postgraduate</MenuItem>
                                                <MenuItem value={"Tertiary"}>Tertiary</MenuItem>

                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                                <Divider />
                                <p></p>
                                <Typography variant='p' sx={{ fontSize: 'large', fontWeight: 'bold' }}>Residence</Typography>
                                <Divider />
                                <Grid container spacing={1} padding=".5em" >

                                    <Grid item xs={12} md={12} lg={6}>
                                        <FormControl fullWidth>
                                            <InputLabel id="demo-simple-select-label">County</InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={patient.county}
                                                label="County"
                                                size="small"
                                                onChange={e => { setCounty(e.target.value); setPatient({ ...patient, county: counties[parseInt(e.target.value)] }) }}>
                                                {counties && counties.map((county) => {
                                                    return <MenuItem value={county.code}>{county.name}</MenuItem>
                                                })}

                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={6}>
                                        <FormControl fullWidth>
                                            <InputLabel id="demo-simple-select-label">Sub-County</InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={patient.constituency}
                                                label="Sub-County"
                                                onChange={e => { setPatient({ ...patient, subCounty: e.target.value }) }}


                                                size="small"
                                            >
                                                {consituencies && consituencies.map((county) => {
                                                    return <MenuItem value={county.code}>{county.name}</MenuItem>

                                                })}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} md={12} lg={6}>
                                        <FormControl fullWidth>
                                            <InputLabel id="demo-simple-select-label">Ward</InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={patient.ward}
                                                label="Ward"
                                                onChange={e => { console.log(e) }}
                                                size="small"
                                            >
                                                {wards && wards.map((county) => {
                                                    return <MenuItem value={county.code}>{county.name}</MenuItem>

                                                })}
                                            </Select>
                                        </FormControl>
                                    </Grid>

                                    <Grid item xs={12} md={12} lg={6}>
                                        <TextField
                                            fullWidth="100%"
                                            type="text"
                                            label="Street"
                                            placeholder="Street"
                                            size="small"
                                            onChange={e => { console.log(e) }}
                                        />
                                    </Grid>
                                </Grid>
                                <p></p>
                                <Divider />
                                <p></p>
                                <Typography variant='p' sx={{ fontSize: 'large', fontWeight: 'bold' }}>Next of kin</Typography>
                                <Divider />
                                <Grid container spacing={1} padding=".5em" >

                                    <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="100%"
                                            type="text"
                                            label="Next of kin names"
                                            placeholder="Next of kin names"
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, inpatientNumber: e.target.value }) }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={4}>
                                        <FormControl fullWidth>
                                            <InputLabel id="demo-simple-select-label">Relationship</InputLabel>
                                            <Select
                                                labelId="demo-simple-select-label"
                                                id="demo-simple-select"
                                                value={patient.nextOfKinRelationship ? patient.nextOfKinRelationship : ""}
                                                label="Relationship"
                                                onChange={e => { setPatient({ ...patient, nextOfKinRelationship: e.target.value }) }}
                                                size="small"
                                            // defaultValue={""}
                                            >
                                                <MenuItem value={"Spouse"}>Spouse</MenuItem>
                                                <MenuItem value={"Child"}>Child</MenuItem>
                                                <MenuItem value={"Parent"}>Parent</MenuItem>
                                                <MenuItem value={"Relatives"}>Relatives</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} md={12} lg={4}>
                                        <TextField
                                            fullWidth="100%"
                                            type="text"
                                            label="Next of Kin's contact/phone no."
                                            placeholder="Next of Kin's contact/phone no."
                                            size="small"
                                            onChange={e => { setPatient({ ...patient, contactPhoneNumber: e.target.value }) }}
                                        />
                                    </Grid>
                                </Grid>

                                <Divider />
                                <p></p>

                                <FormGroup>
                                    <FormControlLabel control={<Checkbox defaultChecked />} label="Woman wants to receive reminders during pregnancy" />
                                </FormGroup>
                                <p></p>
                                <Divider />
                                <p></p>
                                <Stack direction="row" spacing={2} alignContent="right" >
                                    {(!isMobile) && <Typography sx={{ minWidth: '80%' }}></Typography>}
                                    <Button variant='contained' disableElevation sx={{ backgroundColor: 'gray' }}>Cancel</Button>
                                    <Button variant="contained" onClick={e => { registerPatient() }} disableElevation sx={{ backgroundColor: "#632165" }}>Save</Button>
                                </Stack>
                                <p></p>

                            </TabPanel>
                            <TabPanel value='2'>
                                <Typography variant='p' sx={{ fontSize: 'large', fontWeight: 'bold' }}>Registered Patients</Typography>
                                <Divider />
                                <br />
                                <Stack direction="row" gap={1} sx={{ paddingLeft: isMobile ? "1em" : "2em", paddingRight: isMobile ? "1em" : "2em" }}>
                                    <TextField type={"text"} size="small" sx={{ width: "80%" }} placeholder='Patient Name or Patient ID' />
                                    <Button variant="contained" size='small' sx={{ width: "20%" }} disableElevation>Search</Button>
                                </Stack>
                                <br />
                                <Container maxWidth="lg">
                                    <DataGrid
                                        loading={patients ? false : true}
                                        rows={patients ? patients : []}
                                        columns={columns}
                                        pageSize={4}
                                        rowsPerPageOptions={[5]}
                                        checkboxSelection
                                        autoHeight
                                        disableSelectionOnClick
                                        onCellEditStop={e => { console.log(e) }}
                                        onSelectionModelChange={(selection) => {
                                            if (selection.length > 1) {
                                                const selectionSet = new Set(selectionModel);
                                                const result = selection.filter((s) => !selectionSet.has(s));
                                                setSelectionModel(result);
                                            } else {
                                                setSelectionModel(selection);
                                            }
                                        }}
                                    />
                                </Container>
                                <p></p>
                            </TabPanel>

                        </TabContext>
                    </Container>
                </Layout>
            </LocalizationProvider>
        </>
    )

}




