import React, { useEffect, useRef, useState } from 'react';
import { View, PermissionsAndroid, Image, StatusBar, Platform, ActivityIndicator, StyleSheet, Text, Pressable, SafeAreaView, useWindowDimensions } from 'react-native';
import { init, Geolocation, setInterval, Location, setDesiredAccuracy } from 'react-native-amap-geolocation';
import { AMapSdk, MapView, Marker, MapType } from 'react-native-amap3d';

type AppError = {
	kind: 'Permission' | 'Other';
	message: string;
}

const TextButton = (props: {
	label: string;
	onPress: any;
}) => {
	const { label, onPress } = props;
	return (
		<Pressable onPress={onPress} style={styles.btn}>
			<Text style={styles.btn_label}>{label}</Text>
		</Pressable>
	)
}

const App = (props: any) => {
	const dms = useWindowDimensions()
	const [ready, setReady] = useState(false)
	const [error, setError] = useState<AppError | null>(null)
	const [currentMode, setCurrentMode] = useState(0)
	const [position, setPosition] = useState<Location | undefined>()
	const locErrorValue = useRef('')
	const [locError, _setLocError] = useState('')
	const setLocError = (v: any) => {
		_setLocError(v);
		locErrorValue.current = v;
	}
	const map = useRef<MapView | any>();
	async function checkAndRequestPermission(): Promise<boolean> {
		return Promise.all([
			PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
				.then(granted => {
					if (!granted) throw new Error("fine location permission missed")
				}),
			PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION)
				.then(granted => {
					if (!granted) throw new Error("coarse location permission missed")
				})
		]).then(rs => {
			return true
		}).catch(e => {
			return PermissionsAndroid.requestMultiple([
				PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
			]).then(re => {
				return (re['android.permission.ACCESS_FINE_LOCATION'] == 'granted' && re['android.permission.ACCESS_COARSE_LOCATION'] == 'granted')
			}).catch(e => {
				return false
			})
		})
	}
	async function initSDK() {
		AMapSdk.init(Platform.OS == 'ios' ? '' : '63536b2a99bb47d3018dc9eb0983c48a')
		await init({
			android: '63536b2a99bb47d3018dc9eb0983c48a',
			ios: '',
		})
		setInterval(1000)
		setDesiredAccuracy(1)
	}
	useEffect(() => {
		StatusBar.setTranslucent(true);
		StatusBar.setBackgroundColor('transparent');
		StatusBar.setBarStyle('dark-content');
	}, [])

	async function bootstrap() {
		await initSDK();
		let hasPermission = await checkAndRequestPermission();
		if (!hasPermission) {
			return setError({ kind: 'Permission', message: 'Location Permission Rejected' })
		}
		setReady(true)
	}
	useEffect(() => {
		bootstrap()
	}, [])

	useEffect(() => {
		let id: number | undefined;
		if (currentMode == 1) {
			id = Geolocation.watchPosition(
				(position) => {
					if (position.location) {
						// get current location
						let loc = position.location
						setPosition(loc)
						if (map.current) {
							(map.current as MapView).moveCamera({
								target: { latitude: loc.latitude, longitude: loc.longitude }
							})
						}
					}
					if (locErrorValue.current != '') {
						setLocError('')
					}
				},
				(error) => {
					setLocError(error.message)
				}
			)
		}
		return () => {
			if (id != undefined) Geolocation.clearWatch(id)
		}
	}, [currentMode])

	/**
	 * Use Real Location
	 */
	const useRealLocation = () => {
		if (currentMode != 1) {
			setCurrentMode(1)
		} else {
			setCurrentMode(0)
		}
	}

	if (error) {
		return (
			<View style={[styles.page]}>
				<Text style={styles.error_label}>{error.message}</Text>
				{error.kind == 'Permission' && (
					<Pressable style={styles.btn}>
						<Text style={styles.btn_label}>Re-Request Permission</Text>
					</Pressable>
				)}
			</View>
		)
	}
	if (!ready) {
		return <View style={[styles.page]}><ActivityIndicator /></View>
	}
	return (
		<View style={[styles.page, { justifyContent: 'flex-start' }]}>
			<SafeAreaView style={{ flex: 1 }}>
				<MapView
					ref={map}
					mapType={MapType.Standard}
					myLocationEnabled
					myLocationButtonEnabled
					distanceFilter={1}
					style={{
						width: dms.width,
						height: dms.height * 0.68,
					}}
					initialCameraPosition={{
						target: {
							latitude: 22.852223,
							longitude:112.926777
						},
						zoom: 25.0,
					}}
				/>
				<View style={styles.func_box}>
					<View>
						{locError != '' && <Text style={styles.err}>ERROR {locError}</Text>}
						<Text style={styles.mode}>{currentMode == 1 ? 'QUERYING' : 'IDLE'}</Text>
						<View style={styles.row_c}>
							<Text style={styles.loc_label}>Latitude</Text>
							<Text style={[styles.loc_label, { width: undefined }]}>{position?.latitude ?? '--'}</Text>
						</View>
						<View style={styles.row_c}>
							<Text style={styles.loc_label}>Longitude</Text>
							<Text style={[styles.loc_label, { width: undefined }]}>{position?.longitude ?? '--'}</Text>
						</View>
					</View>
					<View style={styles.btns}>
						<TextButton
							label={`${currentMode == 1 ? 'Stop Querying' : 'Start Querying'} Location`}
							onPress={useRealLocation}
						/>
					</View>
				</View>
			</SafeAreaView>
		</View>
	)
}
export default App;
const styles = StyleSheet.create({
	page: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'white'
	},
	error_label: {
		color: '#7D8185',
		fontSize: 18
	},
	btn: {
		padding: 12,
	},
	btn_label: {
		color: '#1078F4',
		fontSize: 15
	},
	func_box: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	btns: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	loc: {
		fontSize: 14,
		color: '#898989'
	},
	loc_label: {
		fontSize: 15,
		color: '#676767',
		width: 80
	},
	mode: {
		color: '#000',
		fontSize: 15,
		marginVertical: 12
	},
	err: {
		fontSize: 15,
		color: 'red'
	},
	row_c: {
		flexDirection: 'row',
		alignItems: 'center'
	}
})