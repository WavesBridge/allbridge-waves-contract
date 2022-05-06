build-bridge:
	surfboard compile bridge.ride
start-node:
	npm run prepare-test
test-bridge:
	surfboard test bridge.ride-test.js
test-assets:
	surfboard test assets.ride-test.js
test-validator:
	surfboard test validator.ride-test.js
test:
	surfboard test
